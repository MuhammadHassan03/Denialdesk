from denialdesk_pipeline.intake.x12_835 import parse_835
from denialdesk_pipeline.intake.x12_835_models import Adjustment
from denialdesk_pipeline.normalize.denials import (
    is_denial_adjustment,
    normalize_transaction,
    sum_denial_amounts,
)
from tests.fixtures import read_835_fixture


def _basic_denials() -> list[tuple[str, str, str, str, int, str]]:
    transaction = parse_835(read_835_fixture("basic_denials.835")).transactions[0]
    normalized = normalize_transaction(transaction)
    summaries: list[tuple[str, str, str, str, int, str]] = []
    for denial in normalized.denials:
        summaries.append(
            (
                denial.payer_claim_control_number,
                f"{denial.group_code}-{denial.carc_code}",
                denial.service_line_ref,
                denial.status,
                denial.amount_at_stake_cents,
                denial.service_date or "",
            )
        )
    return summaries


def test_one_denial_per_claim_reason_and_line() -> None:
    assert _basic_denials() == [
        ("PCCN0001", "CO-4", "LINE1", "new", 20000, "2026-09-14"),
        ("PCCN0001", "CO-16", "line-3", "new", 10000, "2026-09-14"),
        ("PCCN0002", "CO-197", "claim", "new", 120000, "2026-09-01"),
        ("PCCN0004", "CO-50", "L4A", "new", 40000, "2026-09-20"),
        ("PCCN0005", "CO-29", "claim", "new", 25000, "2026-03-01"),
        ("PCCN0006", "CO-999", "claim", "manual", 9000, ""),
    ]


def test_counts_claims_without_denials_and_reversals() -> None:
    transaction = parse_835(read_835_fixture("basic_denials.835")).transactions[0]

    normalized = normalize_transaction(transaction)

    assert normalized.claims_total == 8
    assert normalized.claims_without_denials == 2
    assert normalized.reversals_seen == 1


def test_line_denial_carries_line_and_claim_remarks() -> None:
    transaction = parse_835(read_835_fixture("basic_denials.835")).transactions[0]

    normalized = normalize_transaction(transaction)

    co16_denial = normalized.denials[1]
    assert co16_denial.rarc_codes == ["M51"]
    assert co16_denial.procedure_code == "80053"
    assert co16_denial.line_charge_cents == 10000


def test_no_denials_file() -> None:
    transaction = parse_835(read_835_fixture("no_denials.835")).transactions[0]

    normalized = normalize_transaction(transaction)

    assert normalized.denials == []
    assert normalized.claims_without_denials == 2


def test_normal_adjustments_are_not_denials() -> None:
    for group_code, reason_code in [("CO", "45"), ("PR", "1"), ("PR", "2"), ("PR", "3")]:
        adjustment = Adjustment(group_code=group_code, reason_code=reason_code, amount_cents=100)
        assert not is_denial_adjustment(adjustment, claim_status_code="4")


def test_patient_responsibility_counts_only_on_a_denied_claim() -> None:
    adjustment = Adjustment(group_code="PR", reason_code="96", amount_cents=100)

    assert not is_denial_adjustment(adjustment, claim_status_code="1")
    assert is_denial_adjustment(adjustment, claim_status_code="4")


def test_amounts_for_the_same_reason_are_added_up() -> None:
    adjustments = [
        Adjustment(group_code="CO", reason_code="16", amount_cents=1000),
        Adjustment(group_code="CO", reason_code="45", amount_cents=500),
        Adjustment(group_code="CO", reason_code="16", amount_cents=250),
    ]

    assert sum_denial_amounts(adjustments, claim_status_code="1") == {("CO", "16"): 1250}
