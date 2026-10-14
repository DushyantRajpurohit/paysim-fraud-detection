# Fraud Detection on PaySim: What's Left When You Remove the Shortcut

[![CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

A fraud model for mobile-money transfers: time-ordered evaluation, a threshold
chosen by cost, per-prediction explanations, and a FastAPI scoring service
with a demo page.

The main result is a correction. **PaySim, the usual dataset for this task,
can be solved with one equality check**, so the 0.99 scores reported on it
measure the simulator, not fraud detection. With that shortcut removed, and
every later choice made on time-ordered validation, the served model reaches
**0.634 PR-AUC**, catching 77% of frauds and 96% of the money involved.

## Results

Test set: the last 15% of transactions by time (hours 378–743, 408k
transfers and cash-outs, 4,010 frauds). Nothing was chosen on it.

| Model | PR-AUC | Alerts | Precision | Recall | Fraud amount caught |
|---|---|---|---|---|---|
| PaySim's built-in rule (transfer > 200k) | 0.013 | 13 | 100.0% | 0.3% | 1.1% |
| **One line: `amount == oldbalanceOrg`** | **0.975** | 3,909 | 100.0% | 97.5% | 84.2% |
| LightGBM, all pre-transaction features | 0.989 | 4,747 | 84.3% | 99.8% | 100.0% |
| LightGBM, + post-transaction balances | 0.999 | 3,982 | 99.9% | 99.3% | 97.2% |
| Logistic regression, signature-free | 0.294 | 10,249 | 18.0% | 46.1% | 62.2% |
| **LightGBM, signature-free (served)** | **0.634** | 10,487 | 29.4% | 77.0% | 96.4% |

![Precision-recall curves](reports/pr_curve.png)

## What the first model actually learned

The first LightGBM scored 0.98 using only information available before the
transaction runs. It looked like a strong result, but the saved model had
**one tree**.

That tree had learned a quirk of the simulator. PaySim's fraudster always
moves the account's exact balance:

| | Fraud | Legitimate |
|---|---|---|
| `amount == oldbalanceOrg` | 97.8% | 0.00% |

So a one-line rule reaches 0.975, and every feature that exposes the origin
balance lets a model rediscover that rule. Real fraud doesn't follow a rule
this tidy. The served model leaves out the origin balance entirely
(`SIGNATURE_FREE` in [`fraud/features.py`](fraud/features.py)).

The post-transaction balances are a separate leak: a payment system can't see
them when it has to decide. They are trained only to show the size of that
gap and are never served.

## How the served model was built

Each choice was made on **three rolling-origin folds**: train on everything
before a cut-off, score the next window, with all windows ending before the
test period. Reproduce them with `python -m fraud.experiments`.

| Decision | Evidence (mean fold AP) |
|---|---|
| Start: signature-free features | 0.436 |
| **Add destination history**: how much the account received before, and how this amount compares with its usual | 0.436 → **0.450** |
| **Reject "hours since the destination last received"**, despite a better fold score | 0.458, but drift PSI **0.97** |
| **Require ≥1,000 rows per leaf**: best of a 3×2 grid, better at every tree size | 0.450 → **0.467** |

The rejected feature is the instructive one. On the folds it looked like a
gain. It is also non-stationary: as the simulation runs, accounts go longer
between receipts, so later traffic shows values the model never trained on.
I caught it because test AP dropped (0.584 → 0.510), which is a peek at the
test set, so I turned that into a rule that needs no labels. Input drift can
always be measured on the latest unlabelled traffic, and any feature above
PSI 0.25 is rejected whatever its validation score. That rule alone rejects
it; no other feature comes close (all ≤ 0.104).

Larger trees overfit in the same way: with 63 leaves, validation AP peaks
within ten trees and then falls from 0.40 to 0.24 as the model memorises
hour-specific patterns.

## Other things the data showed

- **Fraud volume is flat over time; legitimate volume isn't.** About 550 frauds
  per 50 hours throughout, while transfer and cash-out volume falls from ~370k
  per 50 hours to under 45k after hour 450. The fraud rate goes from 0.19% in
  training to 1.0% in test. A random split hides this; a time split exposes it.
- **Fraud only occurs in `TRANSFER` and `CASH_OUT`.** The other three types are
  approved without scoring rather than given a meaningless score.

## The threshold is a cost decision

A missed fraud costs its amount; a false alarm costs one analyst review. The
threshold minimises total cost on validation data, using an exact search over
every distinct score rather than a grid
([`fraud/metrics.py`](fraud/metrics.py)). How it moves with the review cost:

| Review cost | Alerts | Precision | Recall | Fraud amount caught |
|---|---|---|---|---|
| 100 | 93,885 | 3.9% | 91.3% | 99.1% |
| 1,000 | 12,761 | 25.7% | 81.7% | 97.6% |
| **10,000 (default)** | 10,487 | 29.4% | 77.0% | 96.4% |
| 100,000 | 2,402 | 76.9% | 46.1% | 82.0% |

The model catches far more of the fraud *amount* than the fraud *count*,
because large frauds score higher than small ones.

## Serving

```bash
uvicorn app:app      # demo page at http://localhost:8000
```

The demo page scores a transaction and shows why. Its presets are real
test-set transactions: a fraud it catches, a fraud it misses, a legitimate
transfer, and a false alarm.

```http
POST /score
{"type": "TRANSFER", "amount": 4445514.2, "oldbalanceOrg": 4445514.2,
 "oldbalanceDest": 0, "step": 379, "dest_prior_txns": 0, "dest_prior_amount": 0}
```

```json
{
  "score": 0.4634,
  "decision": "review",
  "threshold": 0.0136,
  "reasons": [
    {"feature": "log_amount", "contribution": 3.3774},
    {"feature": "dest_empty_before", "contribution": 2.0001},
    {"feature": "log_dest_balance", "contribution": 1.1451}
  ]
}
```

- **Reasons** are exact TreeSHAP values from LightGBM's own `pred_contrib`, in
  log-odds; no extra explanation library.
- **One feature implementation.** The API calls the same `features.build` as
  training, so serving and training features can't drift apart.
- **`POST /score/batch`** for many transactions, **`POST /drift`** for the PSI
  of a batch against a training sample (>0.25 is flagged), **`GET /health`**,
  and OpenAPI docs at `/docs`.
- **`Dockerfile`** builds a serving-only image (no training dependencies) on
  port 7860, ready for a Hugging Face Space.

## Run it

```bash
python -m venv .venv && .venv\Scripts\activate   # Python 3.14
pip install -r requirements.txt
python -m fraud.train          # downloads PaySim (178 MB) on first run; ~5 min
python -m fraud.experiments    # the evidence above; ~30 min
pytest                         # leak-free history, exact threshold, PSI, API, demo page
uvicorn app:app
```

PaySim is loaded with tight dtypes and integer account ids (~300 MB instead
of ~2.5 GB), so the full 6.3M rows train on a 4 GB laptop.

## Layout

| File | |
|---|---|
| [`fraud/features.py`](fraud/features.py) | Feature sets; destination history counted from earlier hours only |
| [`fraud/metrics.py`](fraud/metrics.py) | Exact cost-minimising threshold, PSI |
| [`fraud/train.py`](fraud/train.py) | Time split, baselines, models, cost sweep, artefacts |
| [`fraud/experiments.py`](fraud/experiments.py) | Signature check, drift, feature and tuning decisions on rolling folds |
| [`app.py`](app.py), [`static/index.html`](static/index.html) | FastAPI service and demo page |
| [`tests/test_core.py`](tests/test_core.py) | Leak, threshold (against brute force), drift and API tests |

## Limits

- **PaySim is synthetic.** The main lesson here is about the dataset; 0.634 is
  the honest number *for PaySim*, not a claim about real payments.
- **Destination history is supplied by the caller.** In production it would
  come from a feature store.
- **The review cost is a flat assumption.** That's why the sweep is shown
  rather than a single number.

The widely used Kaggle credit-card dataset (ULB) was left out on purpose: its
features are anonymised PCA components (V1–V28), which leaves nothing to
engineer or explain.
