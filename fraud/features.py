"""Feature engineering for PaySim transactions.

Three feature sets, on purpose:

- REALTIME: only what is known *before* the transaction executes.
- SIGNATURE_FREE: REALTIME without the origin balance. PaySim's fraudster
  always moves the account's exact balance (amount == oldbalanceOrg in 97.8%
  of fraud, ~0% of legitimate rows), so any feature exposing the origin balance
  lets a model learn that simulator quirk instead of fraud. This is the set
  the API serves.
- LEAKY: adds post-transaction balances, which a payment system cannot see at
  decision time. Trained only to show the size of that gap, never served.
"""
import numpy as np
import pandas as pd

# PaySim has no fraud outside these two types (checked in the report), so the
# other three are passed without scoring.
SCORED_TYPES = ("TRANSFER", "CASH_OUT")

REALTIME = [
    "is_transfer",
    "log_amount",
    "hour",
    "log_orig_balance",
    "amount_to_balance",
    "drains_orig",
    "dest_empty_before",
    "log_dest_balance",
    "dest_prior_txns",
]
ORIGIN_BALANCE = ["log_orig_balance", "amount_to_balance", "drains_orig"]
SIGNATURE_FREE = [c for c in REALTIME if c not in ORIGIN_BALANCE]
LEAKY = REALTIME + ["orig_balance_error", "dest_balance_error"]


def dest_prior_txns(df: pd.DataFrame) -> pd.Series:
    """Transactions the destination received in *earlier* steps.

    Same-step rows don't count each other: their order within a step is not
    known, so counting them would let a row see its neighbours.
    """
    per_step = df.groupby(["nameDest", "step"]).size().rename("n").reset_index()
    per_step["prior"] = per_step.groupby("nameDest")["n"].cumsum() - per_step["n"]
    keyed = df[["nameDest", "step"]].merge(per_step, on=["nameDest", "step"], how="left")
    return pd.Series(keyed["prior"].to_numpy(), index=df.index)


def build(df: pd.DataFrame) -> pd.DataFrame:
    """Feature frame for rows of the scored types. Expects `dest_prior_txns`
    already on `df` (computed over all types, since any payment counts)."""
    f = pd.DataFrame(index=df.index)
    f["is_transfer"] = (df["type"] == "TRANSFER").astype(np.int8)
    f["log_amount"] = np.log1p(df["amount"])
    f["hour"] = (df["step"] % 24).astype(np.int8)
    f["log_orig_balance"] = np.log1p(df["oldbalanceOrg"])
    f["amount_to_balance"] = df["amount"] / (df["oldbalanceOrg"] + 1.0)
    f["drains_orig"] = (df["amount"] >= df["oldbalanceOrg"]).astype(np.int8)
    f["dest_empty_before"] = (df["oldbalanceDest"] == 0).astype(np.int8)
    f["log_dest_balance"] = np.log1p(df["oldbalanceDest"])
    f["dest_prior_txns"] = df["dest_prior_txns"]
    if "newbalanceOrig" in df:
        f["orig_balance_error"] = df["oldbalanceOrg"] - df["amount"] - df["newbalanceOrig"]
        f["dest_balance_error"] = df["oldbalanceDest"] + df["amount"] - df["newbalanceDest"]
    return f
