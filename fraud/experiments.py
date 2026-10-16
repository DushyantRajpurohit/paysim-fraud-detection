"""The analysis behind the README's choices. Slow (~30 min on a laptop).

    python -m fraud.experiments

Every decision here is made on rolling-origin folds that end before the test
period; the test set is only scored by fraud.train.
"""

import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.metrics import average_precision_score

from fraud import features, metrics
from fraud.train import load, save_report

# Train on everything before `a`, evaluate on (a, b]. All end at 85%, where test starts.
FOLDS = [(0.40, 0.55), (0.55, 0.70), (0.70, 0.85)]
BASE_PARAMS = dict(n_estimators=300, learning_rate=0.05, num_leaves=15, min_child_samples=200,
                   subsample=0.8, subsample_freq=1, colsample_bytree=0.8, verbose=-1, random_state=0)


def rolling_ap(X, y, step, cut, cols, **params):
    aps = []
    for a, b in FOLDS:
        tr, ev = step <= cut(a), (step > cut(a)) & (step <= cut(b))
        model = lgb.LGBMClassifier(**{**BASE_PARAMS, **params}).fit(X.loc[tr, cols], y[tr])
        aps.append(average_precision_score(y[ev], model.predict_proba(X.loc[ev, cols])[:, 1]))
    return [round(float(v), 3) for v in aps]


def main():
    df = load()
    df = df.join(features.dest_history(df))
    df = df[df.type.isin(features.SCORED_TYPES)].sort_values("step", kind="stable")
    X, y, step = features.build(df), df.isFraud.to_numpy(), df.step.to_numpy()
    cum = df.groupby("step").size().cumsum() / len(df)
    cut = lambda q: cum.index[np.searchsorted(cum.to_numpy(), q)]  # noqa: E731
    out = {}

    # 1. The simulator's signature.
    fraud = y == 1
    exact = (df.amount == df.oldbalanceOrg).to_numpy()
    out["amount_equals_balance"] = {"fraud": float(exact[fraud].mean()), "legit": float(exact[~fraud].mean())}
    print(f"amount == oldbalanceOrg: fraud {exact[fraud].mean():.1%}, legit {exact[~fraud].mean():.3%}")

    # 2. A candidate that was rejected: hours since the destination last received.
    last = (df[["nameDest", "step"]].drop_duplicates()
              .assign(prev=lambda d: d.groupby("nameDest")["step"].shift()))
    since = df[["nameDest", "step"]].merge(last, on=["nameDest", "step"], how="left")
    X["dest_hours_since_last"] = (df.step.to_numpy() - since.prev.to_numpy())
    X["dest_hours_since_last"] = X["dest_hours_since_last"].fillna(-1)
    train, test = step <= cut(0.70), step > cut(0.85)
    out["psi_train_vs_test"] = {c: round(metrics.psi(X[c].to_numpy()[train], X[c].to_numpy()[test]), 3)
                                for c in [*features.SIGNATURE_FREE, "dest_hours_since_last"]}
    print("PSI train vs test:", out["psi_train_vs_test"])
    # Feature drift needs no labels, so the latest traffic is always available
    # to check against. Anything past 0.25 is rejected whatever its fold AP.
    print("Rejected for drift:", [c for c, v in out["psi_train_vs_test"].items() if v > 0.25])

    # 3. Feature sets, judged on rolling folds.
    base = [c for c in features.SIGNATURE_FREE if c not in features.DEST_HISTORY]
    sets = {
        "signature-free, no history": base,
        "+ destination history (served)": features.SIGNATURE_FREE,
        "+ history + hours since last": [*features.SIGNATURE_FREE, "dest_hours_since_last"],
    }
    out["feature_sets"] = {}
    for name, cols in sets.items():
        aps = rolling_ap(X, y, step, cut, cols)
        out["feature_sets"][name] = {"fold_ap": aps, "mean": round(float(np.mean(aps)), 3)}
        print(f"{name:34} folds {aps}  mean {np.mean(aps):.3f}")

    # 4. A small tuning grid on the served features.
    out["tuning"] = {}
    for leaves in (7, 15, 31):
        for min_child in (200, 1000):
            aps = rolling_ap(X, y, step, cut, features.SIGNATURE_FREE,
                             num_leaves=leaves, min_child_samples=min_child)
            key = f"leaves={leaves}, min_child={min_child}"
            out["tuning"][key] = {"fold_ap": aps, "mean": round(float(np.mean(aps)), 3)}
            print(f"{key:28} folds {aps}  mean {np.mean(aps):.3f}")

    save_report("experiments.json", out)


if __name__ == "__main__":
    main()
