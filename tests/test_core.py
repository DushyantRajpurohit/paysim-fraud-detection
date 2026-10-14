import itertools
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from fraud import features, metrics


def test_dest_history_only_counts_earlier_steps():
    df = pd.DataFrame({
        "nameDest": ["A", "A", "A", "B", "A"],
        "step":     [1,   1,   2,   2,   5],
    })
    # Two same-step rows don't see each other; step 2 sees both step-1 rows.
    assert features.dest_prior_txns(df).tolist() == [0, 0, 2, 0, 3]


def test_realtime_features_ignore_post_transaction_balances():
    row = dict(type="TRANSFER", amount=100.0, oldbalanceOrg=100.0, oldbalanceDest=0.0,
               step=25, dest_prior_txns=0)
    a = features.build(pd.DataFrame([row]))[features.REALTIME]
    b = features.build(pd.DataFrame([{**row, "newbalanceOrig": 0.0, "newbalanceDest": 999.0}]))
    pd.testing.assert_frame_equal(a, b[features.REALTIME])
    assert a.hour.item() == 1 and a.drains_orig.item() == 1


def test_best_threshold_matches_brute_force():
    rng = np.random.default_rng(0)
    for _ in range(20):
        n = 40
        scores = rng.choice(np.linspace(0, 1, 15), n)  # ties on purpose
        y = (rng.random(n) < 0.2).astype(int)
        amounts = rng.uniform(1, 500, n)
        _, cost = metrics.best_threshold(scores, y, amounts, review_cost=60)
        brute = min(metrics.cost_at(t, scores, y, amounts, 60)
                    for t in itertools.chain(np.unique(scores), [np.inf]))
        assert cost == pytest.approx(brute)


def test_psi_flags_shift_including_binary_features():
    rng = np.random.default_rng(0)
    ref = rng.normal(size=20_000)
    assert metrics.psi(ref, rng.normal(size=20_000)) < 0.01
    assert metrics.psi(ref, rng.normal(1.0, size=20_000)) > 0.25
    flags = (rng.random(20_000) < 0.1).astype(float)
    assert metrics.psi(flags, (rng.random(20_000) < 0.5).astype(float)) > 0.25


@pytest.mark.skipif(not (Path(__file__).parents[1] / "models/model.txt").exists(),
                    reason="run python -m fraud.train first")
def test_api_scores_and_explains():
    from fastapi.testclient import TestClient
    from app import app

    client = TestClient(app)
    tx = dict(type="TRANSFER", amount=181.0, oldbalanceOrg=181.0, oldbalanceDest=0.0, step=1)
    body = client.post("/score", json=tx).json()
    assert 0 <= body["score"] <= 1 and len(body["reasons"]) == 3
    assert client.post("/score", json={**tx, "type": "PAYMENT"}).json()["decision"] == "approve"
    assert client.post("/score", json={**tx, "amount": -1}).status_code == 422
