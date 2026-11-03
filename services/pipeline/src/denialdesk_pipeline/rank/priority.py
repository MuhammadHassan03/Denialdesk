"""Queue order: bucket by days left, then biggest amount, then earliest deadline, then id. Pure.

The queue sorts by priority_bucket (the enum is declared most urgent first)
and then by rank_key as plain text.
"""

from datetime import date
from typing import Literal

PriorityBucket = Literal["overdue", "due_within_7", "due_within_30", "due_later"]

DUE_SOON_DAYS = 7
DUE_THIS_MONTH_DAYS = 30

# rank_key sorts as text, so the amount is stored as (ceiling - amount), zero
# padded. A larger amount then gives a smaller key and comes first. The ceiling
# is above the largest value a Postgres integer column can hold.
RANK_AMOUNT_CEILING_CENTS = 999_999_999_999
RANK_AMOUNT_DIGITS = 12


def days_left(appeal_deadline: str, today: str) -> int:
    return (date.fromisoformat(appeal_deadline) - date.fromisoformat(today)).days


def priority_bucket(appeal_deadline: str, today: str) -> PriorityBucket:
    remaining_days = days_left(appeal_deadline, today)
    if remaining_days < 0:
        return "overdue"
    if remaining_days <= DUE_SOON_DAYS:
        return "due_within_7"
    if remaining_days <= DUE_THIS_MONTH_DAYS:
        return "due_within_30"
    return "due_later"


def rank_key(amount_at_stake_cents: int, appeal_deadline: str, denial_id: str) -> str:
    if amount_at_stake_cents < 0 or amount_at_stake_cents > RANK_AMOUNT_CEILING_CENTS:
        raise ValueError("Amount at stake is outside the range the rank key supports")
    inverted_amount = RANK_AMOUNT_CEILING_CENTS - amount_at_stake_cents
    padded_amount = str(inverted_amount).zfill(RANK_AMOUNT_DIGITS)
    return f"{padded_amount}|{appeal_deadline}|{denial_id}"
