"""Business metrics: cost-based thresholds and drift (PSI)."""
import numpy as np

# A false alarm costs one analyst review. A missed fraud costs its amount.
# ponytail: flat review cost; a real deployment would take this from ops data.
REVIEW_COST = 10_000.0  # ~6% of the median legitimate transfer (171k)


def cost_at(threshold, scores, y, amounts, review_cost=REVIEW_COST):
    flagged = scores >= threshold
    missed = (~flagged) & (y == 1)
    return amounts[missed].sum() + flagged.sum() * review_cost


def best_threshold(scores, y, amounts, review_cost=REVIEW_COST):
    """Threshold minimising total cost. Evaluated at every distinct score, so
    the optimum is exact, not a grid approximation."""
    order = np.argsort(-scores)
    s, yy, a = scores[order], y[order], amounts[order]
    # Flagging the top k rows: cost = fraud amount outside the top k + k reviews.
    fraud_amt = np.where(yy == 1, a, 0.0)
    missed = fraud_amt.sum() - np.cumsum(fraud_amt)
    cost = missed + np.arange(1, len(s) + 1) * review_cost
    # Only cut between distinct scores: tied rows are flagged together.
    last_of_tie = np.r_[s[1:] != s[:-1], True]
    cost = np.where(last_of_tie, cost, np.inf)
    k = int(np.argmin(cost))
    flag_nothing = fraud_amt.sum()
    if flag_nothing <= cost[k]:
        return np.inf, flag_nothing
    return s[k], cost[k]


def psi(reference, current, bins=10):
    """Population Stability Index of `current` against `reference`.
    < 0.1 stable, 0.1–0.25 watch, > 0.25 drifted (the usual rule of thumb)."""
    values = np.unique(reference)
    if len(values) <= bins:  # discrete (flags, hour): one bin per value
        inner = (values[:-1] + values[1:]) / 2
    else:
        inner = np.unique(np.quantile(reference, np.linspace(0, 1, bins + 1)[1:-1]))
    edges = np.r_[-np.inf, inner, np.inf]
    ref = np.histogram(reference, edges)[0] / len(reference)
    cur = np.histogram(current, edges)[0] / len(current)
    ref, cur = np.clip(ref, 1e-6, None), np.clip(cur, 1e-6, None)
    return float(np.sum((cur - ref) * np.log(cur / ref)))
