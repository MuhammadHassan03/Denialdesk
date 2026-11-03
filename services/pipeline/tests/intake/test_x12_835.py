from denialdesk_pipeline.intake.x12_835 import (
    DAMAGED_VALUE_MESSAGE,
    INCOMPLETE_FILE_WARNING,
    NOT_AN_835_MESSAGE,
    SEGMENT_COUNT_WARNING,
    parse_835,
)
from tests.fixtures import read_835_fixture


def test_reads_payer_payment_and_trace() -> None:
    result = parse_835(read_835_fixture("basic_denials.835"))

    assert result.biller_error is None
    assert result.warnings == []
    transaction = result.transactions[0]
    assert transaction.payer_name == "SYNTHETIC HEALTH PLAN"
    assert transaction.payer_identifier == "SYN01"
    assert transaction.payment_date == "2026-10-15"
    assert transaction.trace_number == "EFT0000001"
    assert len(transaction.claims) == 8


def test_reads_claim_fields_in_cents() -> None:
    result = parse_835(read_835_fixture("basic_denials.835"))

    claim = result.transactions[0].claims[0]
    assert claim.patient_control_number == "PCN1001"
    assert claim.claim_status_code == "1"
    assert claim.charge_cents == 60000
    assert claim.paid_cents == 30000
    assert claim.payer_claim_control_number == "PCCN0001"
    assert claim.service_start_date == "2026-09-14"


def test_reads_service_lines_with_their_adjustments_and_remarks() -> None:
    result = parse_835(read_835_fixture("basic_denials.835"))

    lines = result.transactions[0].claims[0].service_lines
    assert len(lines) == 3
    first_line = lines[0]
    assert first_line.line_ref == "LINE1"
    assert first_line.procedure_code == "99213"
    assert first_line.procedure_modifiers == ["25"]
    assert first_line.service_date == "2026-09-14"
    assert first_line.adjustments[0].group_code == "CO"
    assert first_line.adjustments[0].reason_code == "4"
    assert first_line.adjustments[0].amount_cents == 20000
    third_line = lines[2]
    assert third_line.line_ref == "line-3"
    assert third_line.remark_codes == ["M51"]


def test_claim_level_adjustments_and_moa_remarks() -> None:
    result = parse_835(read_835_fixture("basic_denials.835"))

    claim = result.transactions[0].claims[1]
    assert claim.claim_status_code == "4"
    assert claim.adjustments[0].reason_code == "197"
    assert claim.adjustments[0].amount_cents == 120000
    assert claim.remark_codes == ["N54"]


def test_reversal_amounts_stay_negative() -> None:
    result = parse_835(read_835_fixture("basic_denials.835"))

    reversal = result.transactions[0].claims[6]
    assert reversal.claim_status_code == "22"
    assert reversal.charge_cents == -50000


def test_separators_come_from_the_isa_segment() -> None:
    standard = parse_835(read_835_fixture("basic_denials.835"))
    custom = parse_835(read_835_fixture("custom_separators.835"))

    assert custom.biller_error is None
    assert custom.transactions == standard.transactions


def test_every_transaction_in_a_file_is_read() -> None:
    result = parse_835(read_835_fixture("two_transactions.835"))

    assert len(result.transactions) == 2
    assert result.transactions[1].claims[0].patient_control_number == "PCN2001"


def test_claim_file_is_named_in_the_error() -> None:
    result = parse_835(read_835_fixture("claim_file.837"))

    assert result.biller_error is not None
    assert "837 claim file" in result.biller_error
    assert result.transactions == []


def test_non_x12_file_is_rejected() -> None:
    result = parse_835(read_835_fixture("not_x12.txt"))

    assert result.biller_error == NOT_AN_835_MESSAGE


def test_truncated_file_keeps_complete_claims_and_warns() -> None:
    result = parse_835(read_835_fixture("truncated.835"))

    assert result.biller_error is None
    assert result.warnings == [INCOMPLETE_FILE_WARNING]
    assert len(result.transactions[0].claims) == 8


def test_wrong_segment_count_warns() -> None:
    result = parse_835(read_835_fixture("wrong_segment_count.835"))

    assert result.biller_error is None
    assert SEGMENT_COUNT_WARNING in result.warnings


def test_missing_payment_date_is_none() -> None:
    result = parse_835(read_835_fixture("no_payment_date.835"))

    assert result.transactions[0].payment_date is None


def test_damaged_amount_fails_with_a_plain_message() -> None:
    damaged_text = read_835_fixture("basic_denials.835").replace(
        "CLP*PCN1001*1*600*", "CLP*PCN1001*1*6O0*"
    )

    result = parse_835(damaged_text)

    assert result.biller_error == DAMAGED_VALUE_MESSAGE


def test_parsing_is_deterministic() -> None:
    file_text = read_835_fixture("basic_denials.835")

    assert parse_835(file_text) == parse_835(file_text)
