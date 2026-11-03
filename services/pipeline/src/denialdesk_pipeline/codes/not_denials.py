"""Adjustment codes that are normal parts of payment and never count as denials."""

NOT_DENIAL_CODES = frozenset(
    {
        "CO-45",  # Charge exceeds the fee schedule
        "PR-1",  # Deductible
        "PR-2",  # Coinsurance
        "PR-3",  # Copay
    }
)
