import pytest

from denialdesk_pipeline.intake.x12_values import X12ValueError, parse_amount_cents, parse_x12_date


@pytest.mark.parametrize(
    ("amount_text", "expected_cents"),
    [
        ("123.45", 12345),
        ("200", 20000),
        ("100.5", 10050),
        (".75", 75),
        ("-500", -50000),
        ("0", 0),
    ],
)
def test_amounts_become_whole_cents(amount_text: str, expected_cents: int) -> None:
    assert parse_amount_cents(amount_text) == expected_cents


@pytest.mark.parametrize("amount_text", ["", "12.345", "1,200.00", "abc", "-"])
def test_bad_amounts_are_rejected(amount_text: str) -> None:
    with pytest.raises(X12ValueError):
        parse_amount_cents(amount_text)


def test_x12_dates_become_iso_dates() -> None:
    assert parse_x12_date("20261015") == "2026-10-15"


@pytest.mark.parametrize("date_text", ["2026101", "20261301", "20260230", "2026-10-15"])
def test_bad_dates_are_rejected(date_text: str) -> None:
    with pytest.raises(X12ValueError):
        parse_x12_date(date_text)
