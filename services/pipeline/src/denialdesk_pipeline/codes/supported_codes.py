"""Denial codes Denialdesk drafts for. Any other code is worked manually."""

SUPPORTED_DENIAL_CODES = frozenset({"CO-197", "CO-50", "CO-4", "CO-16", "CO-29"})


def denial_code(group_code: str, carc_code: str) -> str:
    return f"{group_code}-{carc_code}"


def is_supported_denial_code(group_code: str, carc_code: str) -> bool:
    return denial_code(group_code, carc_code) in SUPPORTED_DENIAL_CODES
