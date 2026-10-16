"""Scoring API.

    uvicorn app:app --reload        # after python -m fraud.train

Features are built by the same `features.build` used in training, so there is
no second implementation to drift out of step with it.
"""
import json
from pathlib import Path
from typing import Literal

import lightgbm as lgb
import numpy as np
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from fraud import features, metrics

MODELS = Path(__file__).resolve().parent / "models"
meta = json.loads((MODELS / "metadata.json").read_text())
booster = lgb.Booster(model_file=str(MODELS / "model.txt"))
reference = pd.read_parquet(MODELS / "reference.parquet")

app = FastAPI(title="Fraud scoring", version="1.0")
# The story site on GitHub Pages calls /score from the browser.
app.add_middleware(CORSMiddleware, allow_origins=["https://dushyantrajpurohit.github.io"],
                   allow_methods=["GET", "POST"], allow_headers=["Content-Type"])


class Transaction(BaseModel):
    type: Literal["CASH_IN", "CASH_OUT", "DEBIT", "PAYMENT", "TRANSFER"]
    amount: float = Field(ge=0)
    oldbalanceOrg: float = Field(ge=0)
    oldbalanceDest: float = Field(ge=0)
    step: int = Field(ge=1, description="Hour since the start of the simulation")
    # ponytail: destination history is passed in by the caller; production
    # would read it from a feature store.
    dest_prior_txns: int = Field(0, ge=0, description="Payments the destination received before this hour")
    dest_prior_amount: float = Field(0, ge=0, description="Total the destination received before this hour")


class Reason(BaseModel):
    feature: str
    contribution: float


class Score(BaseModel):
    score: float | None
    decision: Literal["approve", "review"]
    threshold: float
    reasons: list[Reason]


@app.get("/", include_in_schema=False)
def demo():
    return FileResponse(Path(__file__).resolve().parent / "static" / "index.html")


@app.get("/health")
def health():
    return {"status": "ok", "features": meta["features"], "threshold": meta["threshold"]}


@app.post("/score", response_model=Score)
def score(tx: Transaction):
    if tx.type not in features.SCORED_TYPES:
        # No fraud of these types exists in the training data, so a score would be noise.
        return Score(score=None, decision="approve", threshold=meta["threshold"], reasons=[])
    return score_frame(pd.DataFrame([tx.model_dump()]))[0]


@app.post("/score/batch", response_model=list[Score])
def score_batch(txs: list[Transaction]):
    return [score(tx) for tx in txs]


@app.post("/drift")
def drift(txs: list[Transaction]):
    """PSI of a batch against the training reference, per feature."""
    scored = [tx.model_dump() for tx in txs if tx.type in features.SCORED_TYPES]
    if len(scored) < 100:
        return {"error": "need at least 100 TRANSFER/CASH_OUT transactions for a stable PSI"}
    X = features.build(pd.DataFrame(scored))[meta["features"]]
    psi = {c: round(metrics.psi(reference[c].to_numpy(), X[c].to_numpy()), 4) for c in meta["features"]}
    return {"psi": psi, "drifted": [c for c, v in psi.items() if v > 0.25]}


def score_frame(df: pd.DataFrame) -> list[Score]:
    X = features.build(df)[meta["features"]]
    probs = booster.predict(X)
    # pred_contrib gives exact TreeSHAP values (last column is the bias term).
    contribs = booster.predict(X, pred_contrib=True)[:, :-1]
    out = []
    for p, c in zip(probs, contribs):
        top = np.argsort(-np.abs(c))[:3]
        out.append(Score(
            score=float(p),
            decision="review" if p >= meta["threshold"] else "approve",
            threshold=meta["threshold"],
            reasons=[Reason(feature=meta["features"][i], contribution=round(float(c[i]), 4)) for i in top],
        ))
    return out
