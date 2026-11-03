"""Turn X12 element text into cents and ISO dates, without ever using floats."""

from datetime import date

CENTS_PER_DOLLAR = 100
CENT_DIGITS = 2
X12_DATE_LENGTH = 8


class X12ValueError(ValueError):
    """An element doesn't hold the kind of value the 835 spec says it should.

    Messages name the problem only, never the value, so they are safe to log.
    """


def parse_amount_cents(amount_text: str) -> int:
    is_negative = amount_text.startswith("-")
    unsigned_text = amount_text.removeprefix("-")
    whole_text, _, fraction_text = unsigned_text.partition(".")

    if whole_text == "" and fraction_text == "":
        raise X12ValueError("Amount is empty")
    if whole_text != "" and not whole_text.isdigit():
        raise X12ValueError("Amount has non-digit characters")
    if fraction_text != "" and not fraction_text.isdigit():
        raise X12ValueError("Amount has non-digit characters")
    if len(fraction_text) > CENT_DIGITS:
        raise X12ValueError("Amount has more than two decimal places")

    whole_dollars = int(whole_text or "0")
    cents_part = int(fraction_text.ljust(CENT_DIGITS, "0"))
    amount_cents = whole_dollars * CENTS_PER_DOLLAR + cents_part
    if is_negative:
        return -amount_cents
    return amount_cents


def parse_x12_date(date_text: str) -> str:
    """CCYYMMDD to YYYY-MM-DD."""
    if len(date_text) != X12_DATE_LENGTH or not date_text.isdigit():
        raise X12ValueError("Date is not in CCYYMMDD form")
    year = int(date_text[0:4])
    month = int(date_text[4:6])
    day = int(date_text[6:8])
    try:
        calendar_date = date(year, month, day)
    except ValueError as error:
        raise X12ValueError("Date is not on the calendar") from error
    return calendar_date.isoformat()
