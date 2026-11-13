"""Modifiers a corrected claim may add. A starter list of common CPT and HCPCS modifiers.

Add to it when a biller needs one that is missing; never accept a modifier that is not here.
"""

ALLOWED_MODIFIERS = frozenset(
    {
        "22", "24", "25", "26", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59",
        "62", "76", "77", "78", "79", "80", "81", "82", "91", "95",
        "LT", "RT", "TC", "XE", "XP", "XS", "XU", "GA", "GY", "GZ", "KX", "QW", "AS",
    }
)  # fmt: skip

# Modifiers that can lift an NCCI procedure-to-procedure edit when the edit allows one.
NCCI_BYPASS_MODIFIERS = frozenset({"25", "59", "XE", "XP", "XS", "XU", "LT", "RT", "91"})
