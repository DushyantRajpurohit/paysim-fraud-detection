"""Train, evaluate and save the fraud model.

    python -m fraud.train            # downloads PaySim on first run

Writes models/ (served artefacts) and reports/ (metrics, PR curve).
"""
import json
from pathlib import Path

import lightgbm as lgb
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import average_precision_score, precision_recall_curve, roc_auc_score
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler

from fraud import features, metrics

ROOT = Path(__file__).resolve().parent.parent
DATA, MODELS, REPORTS = ROOT / "data", ROOT / "models", ROOT / "reports"
SITE_DATA = ROOT / "docs" / "data"  # the story site reads the same numbers
SPLIT = (0.70, 0.85)  # train | validation | test, by time


def load() -> pd.DataFrame:
    cache = DATA / "paysim.parquet"
    if cache.exists():
        return pd.read_parquet(cache)
    import kagglehub

    folder = Path(kagglehub.dataset_download("ealaxi/paysim1"))
    # Tight dtypes: the raw frame with default types needs ~2.5 GB; this fits in ~300 MB.
    money = ["amount", "oldbalanceOrg", "newbalanceOrig", "oldbalanceDest", "newbalanceDest"]
    df = pd.read_csv(
        next(folder.glob("*.csv")), engine="pyarrow",
        usecols=["step", "type", *money, "nameDest", "isFraud", "isFlaggedFraud"],
        dtype={"step": "int16", "type": "category", **dict.fromkeys(money, "float32"),
               "isFraud": "int8", "isFlaggedFraud": "int8"},
    )
    # Account names are only ever compared for equality, so integer ids do.
    df["nameDest"] = pd.factorize(df["nameDest"])[0].astype("int32")
    DATA.mkdir(exist_ok=True)
    df.to_parquet(cache)
    return df


def save_report(name, obj):
    """Write a report and its copy for the story site, so the page can never
    show a number the pipeline did not produce."""
    text = json.dumps(obj, indent=2)
    for folder in (REPORTS, SITE_DATA):
        folder.mkdir(parents=True, exist_ok=True)
        (folder / name).write_text(text)


def time_split(df):
    """Cut on step boundaries so no hour is split across sets."""
    cum = df.groupby("step").size().cumsum() / len(df)
    t1, t2 = (cum.index[np.searchsorted(cum.to_numpy(), q)] for q in SPLIT)
    return df[df.step <= t1], df[(df.step > t1) & (df.step <= t2)], df[df.step > t2]


def evaluate(name, scores, y, amounts, threshold):
    flagged = scores >= threshold
    tp = int((flagged & (y == 1)).sum())
    return {
        "model": name,
        "pr_auc": float(average_precision_score(y, scores)),
        "roc_auc": float(roc_auc_score(y, scores)),
        "threshold": float(threshold),
        "precision": tp / max(int(flagged.sum()), 1),
        "recall": tp / int(y.sum()),
        "fraud_amount_caught": float(amounts[flagged & (y == 1)].sum() / amounts[y == 1].sum()),
        "alerts": int(flagged.sum()),
        "cost": float(metrics.cost_at(threshold, scores, y, amounts)),
    }


def main():
    df = load()
    unscored = df[~df.type.isin(features.SCORED_TYPES)]
    print(f"{len(df):,} transactions, {int(df.isFraud.sum()):,} fraud; "
          f"fraud outside {features.SCORED_TYPES}: {int(unscored.isFraud.sum())}")

    df = df.join(features.dest_history(df))  # over all types
    df = df[df.type.isin(features.SCORED_TYPES)].sort_values("step", kind="stable")
    train, val, test = time_split(df)
    for name, part in [("train", train), ("val", val), ("test", test)]:
        print(f"{name:5} steps {part.step.min()}-{part.step.max()}: "
              f"{len(part):,} rows, {int(part.isFraud.sum()):,} fraud")

    X = {k: features.build(p) for k, p in [("train", train), ("val", val), ("test", test)]}
    y = {k: p.isFraud.to_numpy() for k, p in [("train", train), ("val", val), ("test", test)]}
    amt = {k: p.amount.to_numpy() for k, p in [("train", train), ("val", val), ("test", test)]}

    results, test_scores = [], {}

    # Rules first: anything a model reports has to beat these.
    rules = {
        "PaySim built-in rule (transfer > 200k)": test.isFlaggedFraud.to_numpy(),
        "One-line rule: amount == origin balance": (test.amount == test.oldbalanceOrg).to_numpy(),
    }
    for name, flags in rules.items():
        results.append(evaluate(name, flags.astype(float), y["test"], amt["test"], 0.5))

    def fit_lgb(cols, **params):
        # Small, heavily regularised trees: with 63 leaves validation AP peaks
        # within ten trees, then falls as the model memorises hour-specific
        # patterns. Leaf size picked on rolling folds (fraud/experiments.py).
        model = lgb.LGBMClassifier(**{**dict(n_estimators=2000, learning_rate=0.05, num_leaves=15,
                                              min_child_samples=1000, subsample=0.8, subsample_freq=1,
                                              colsample_bytree=0.8, verbose=-1, random_state=0), **params})
        model.fit(X["train"][cols], y["train"], eval_X=(X["val"][cols],), eval_y=(y["val"],),
                  eval_metric="average_precision",
                  callbacks=[lgb.early_stopping(100, verbose=False)])
        return model

    served_name = "LightGBM, signature-free (served)"
    candidates = {
        "LightGBM, all pre-transaction features": (fit_lgb(features.REALTIME), features.REALTIME),
        "LightGBM, + post-transaction balances": (fit_lgb(features.LEAKY), features.LEAKY),
        "Logistic regression, signature-free": (
            make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000))
            .fit(X["train"][features.SIGNATURE_FREE], y["train"]), features.SIGNATURE_FREE),
        served_name: (fit_lgb(features.SIGNATURE_FREE), features.SIGNATURE_FREE),
    }
    val_scores = {}
    for name, (model, cols) in candidates.items():
        val_scores[name] = model.predict_proba(X["val"][cols])[:, 1]
        threshold, _ = metrics.best_threshold(val_scores[name], y["val"], amt["val"])
        test_scores[name] = model.predict_proba(X["test"][cols])[:, 1]
        r = evaluate(name, test_scores[name], y["test"], amt["test"], threshold)
        if hasattr(model, "booster_"):
            r["trees"] = model.booster_.num_trees()
        results.append(r)

    served = candidates[served_name][0]
    served_result = next(r for r in results if r["model"] == served_name)
    # The threshold is a business decision; show how it moves with review cost.
    sweep = []
    for review_cost in np.geomspace(10, 1_000_000, 31).round():
        t, _ = metrics.best_threshold(val_scores[served_name], y["val"], amt["val"], review_cost)
        r = evaluate(served_name, test_scores[served_name], y["test"], amt["test"], t)
        r["cost"] = float(metrics.cost_at(t, test_scores[served_name], y["test"], amt["test"], review_cost))
        sweep.append({"review_cost": int(review_cost), **r})
    cols = features.SIGNATURE_FREE
    drift = {c: metrics.psi(X["train"][c].to_numpy(), X["test"][c].to_numpy()) for c in cols}

    MODELS.mkdir(exist_ok=True)
    REPORTS.mkdir(exist_ok=True)
    served.booster_.save_model(MODELS / "model.txt")
    # Reference sample for drift checks on live batches.
    X["train"][cols].sample(50_000, random_state=0).to_parquet(MODELS / "reference.parquet")
    (MODELS / "metadata.json").write_text(json.dumps({
        "features": cols,
        "threshold": served_result["threshold"],
        "review_cost": metrics.REVIEW_COST,
        "trained_on_steps": [int(train.step.min()), int(train.step.max())],
    }, indent=2))
    # My first attempt, kept reproducible: the features and tree size I started
    # with (before destination history existed). Early stopping keeps almost
    # nothing, because a split on the origin balance already separates PaySim's fraud.
    first_cols = [c for c in features.REALTIME if c not in features.DEST_HISTORY]
    first = fit_lgb(first_cols, num_leaves=63, min_child_samples=50)
    first_attempt = {
        "features": first_cols,
        "trees": first.booster_.num_trees(),
        "pr_auc": float(average_precision_score(y["test"], first.predict_proba(X["test"][first_cols])[:, 1])),
    }
    is_fraud, exact = df.isFraud.to_numpy() == 1, (df.amount == df.oldbalanceOrg).to_numpy()
    by_day = df.groupby(df.step // 24).isFraud.agg(["size", "sum"])
    save_report("metrics.json", {
        "results": results, "review_cost_sweep": sweep, "psi_train_vs_test": drift,
        "first_attempt": first_attempt,
        "signature": {"fraud": int(is_fraud.sum()), "fraud_equal": int((exact & is_fraud).sum()),
                      "legit": int((~is_fraud).sum()), "legit_equal": int((exact & ~is_fraud).sum())},
        "split": {k: {"steps": [int(p.step.min()), int(p.step.max())], "rows": len(p),
                      "fraud": int(p.isFraud.sum())} for k, p in [("train", train), ("val", val), ("test", test)]},
        "volume_by_day": [{"day": int(d), "legit": int(r["size"] - r["sum"]), "fraud": int(r["sum"])}
                          for d, r in by_day.iterrows()],
    })
    curves = {}
    for name, scores in {**{k: v.astype(float) for k, v in rules.items()}, **test_scores}.items():
        prec, rec, _ = precision_recall_curve(y["test"], scores)
        keep = np.unique(np.searchsorted(-rec, -np.linspace(1, 0, 200)).clip(0, len(rec) - 1))
        curves[name] = {"recall": rec[keep].round(4).tolist(), "precision": prec[keep].round(4).tolist()}
    save_report("curves.json", curves)
    plot_pr(test_scores, y["test"])
    print_table(results, sweep, drift, served)


def plot_pr(test_scores, y):
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    fig, ax = plt.subplots(figsize=(6, 4.5))
    for name, scores in test_scores.items():
        p, r, _ = precision_recall_curve(y, scores)
        ax.plot(r, p, label=f"{name} (AP {average_precision_score(y, scores):.3f})")
    ax.set(xlabel="Recall", ylabel="Precision", title="Test set, last 15% of hours")
    ax.legend(fontsize=8, loc="lower left")
    fig.tight_layout()
    fig.savefig(REPORTS / "pr_curve.png", dpi=150)


def print_table(results, sweep, drift, served):
    print("\n| Model | Trees | PR-AUC | Alerts | Precision | Recall | Fraud amount caught |")
    print("|---|---|---|---|---|---|---|")
    for r in results:
        print(f"| {r['model']} | {r.get('trees', '')} | {r['pr_auc']:.3f} | {r['alerts']:,} "
              f"| {r['precision']:.1%} | {r['recall']:.1%} | {r['fraud_amount_caught']:.1%} |")
    print("\n| Review cost | Threshold | Alerts | Precision | Recall | Fraud amount caught |")
    print("|---|---|---|---|---|---|")
    for r in (r for r in sweep if r["review_cost"] in (100, 1_000, 10_000, 100_000)):
        print(f"| {r['review_cost']:,} | {r['threshold']:.4f} | {r['alerts']:,} | {r['precision']:.1%} "
              f"| {r['recall']:.1%} | {r['fraud_amount_caught']:.1%} |")
    imp = sorted(zip(served.booster_.feature_name(), served.booster_.feature_importance("gain")),
                 key=lambda t: -t[1])
    print("\nGain importance (served):", ", ".join(f"{n} {g:.0f}" for n, g in imp))
    print("PSI train vs test:", ", ".join(f"{k} {v:.3f}" for k, v in drift.items()))


if __name__ == "__main__":
    main()
