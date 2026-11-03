"""835 remittance file to raw claim payments.

Our own parser: read the separators from the ISA segment, split the file into
segments, and walk them one by one. Docling is never used for 835 files.
"""

from denialdesk_pipeline.intake.x12_835_claims import (
    LINE_ITEM_CONTROL_QUALIFIER,
    read_adjustments,
    read_claim_remarks,
    read_date,
    read_line_remark,
    start_claim,
    start_service_line,
)
from denialdesk_pipeline.intake.x12_835_models import Parse835Result, Transaction835
from denialdesk_pipeline.intake.x12_835_state import (
    ParseState,
    Separators,
    add_warning,
    element,
)
from denialdesk_pipeline.intake.x12_values import X12ValueError, parse_x12_date

ISA_SEGMENT_LENGTH = 106
ISA_ELEMENT_SEPARATOR_INDEX = 3
ISA_SUB_ELEMENT_SEPARATOR_INDEX = 104
ISA_SEGMENT_TERMINATOR_INDEX = 105
BYTE_ORDER_MARK = "﻿"

REMITTANCE_TRANSACTION_TYPE = "835"
PAYER_ENTITY_CODE = "PR"
PAYER_IDENTIFIER_QUALIFIER = "2U"
BPR_PAYMENT_DATE_INDEX = 16

NOT_AN_835_MESSAGE = (
    "We couldn't find an 835 in this file. Upload the 835 remittance you got back from the payer."
)
DAMAGED_VALUE_MESSAGE = (
    "This 835 has an amount or date we couldn't read, so it may be damaged."
    " Download it again from the payer or clearinghouse and upload the new copy."
)
INCOMPLETE_FILE_WARNING = "The file looks incomplete, so some claims may be missing."
SEGMENT_COUNT_WARNING = (
    "The file's segment count doesn't match its contents, so some claims may be missing."
)

OTHER_TRANSACTION_MESSAGES = {
    "837": (
        "This is an 837 claim file. Denialdesk needs the 835 remittance that comes back"
        " from the payer."
    ),
    "277": (
        "This is a 277 claim status file. Denialdesk needs the 835 remittance that comes back"
        " from the payer."
    ),
}


def read_separators(file_text: str) -> Separators | None:
    if len(file_text) < ISA_SEGMENT_LENGTH or not file_text.startswith("ISA"):
        return None
    return Separators(
        element=file_text[ISA_ELEMENT_SEPARATOR_INDEX],
        sub_element=file_text[ISA_SUB_ELEMENT_SEPARATOR_INDEX],
        segment=file_text[ISA_SEGMENT_TERMINATOR_INDEX],
    )


def parse_835(file_text: str) -> Parse835Result:
    cleaned_text = file_text.lstrip(BYTE_ORDER_MARK).lstrip()
    separators = read_separators(cleaned_text)
    if separators is None:
        return _failed(NOT_AN_835_MESSAGE, segment_count=0)

    segments = _split_segments(cleaned_text, separators)
    state = ParseState()
    for elements in segments:
        try:
            biller_error = _read_segment(elements, separators, state)
        except X12ValueError:
            return _failed(DAMAGED_VALUE_MESSAGE, segment_count=len(segments))
        if biller_error is not None:
            return _failed(biller_error, segment_count=len(segments))

    if state.transaction is not None:
        _finish_transaction(state)
        add_warning(state, INCOMPLETE_FILE_WARNING)
    if not state.saw_functional_group_end or not state.saw_interchange_end:
        add_warning(state, INCOMPLETE_FILE_WARNING)
    if not state.transactions:
        return _failed(NOT_AN_835_MESSAGE, segment_count=len(segments))

    return Parse835Result(
        transactions=state.transactions,
        warnings=state.warnings,
        biller_error=None,
        segment_count=len(segments),
    )


def _failed(biller_error: str, segment_count: int) -> Parse835Result:
    return Parse835Result(
        transactions=[], warnings=[], biller_error=biller_error, segment_count=segment_count
    )


def _split_segments(file_text: str, separators: Separators) -> list[list[str]]:
    segments: list[list[str]] = []
    for raw_segment in file_text.split(separators.segment):
        segment_text = raw_segment.strip()
        if segment_text == "":
            continue
        segments.append(segment_text.split(separators.element))
    return segments


def _read_segment(elements: list[str], separators: Separators, state: ParseState) -> str | None:
    """Apply one segment to the parse state. Returns a biller error if the file can't be used."""
    segment_id = elements[0]
    if state.transaction is not None:
        state.segments_in_transaction += 1

    if segment_id == "ST":
        return _start_transaction(elements, state)
    if segment_id == "SE":
        _end_transaction(elements, state)
        return None
    if segment_id == "GE":
        state.saw_functional_group_end = True
        return None
    if segment_id == "IEA":
        state.saw_interchange_end = True
        return None

    transaction = state.transaction
    if transaction is None:
        return None

    if segment_id == "BPR":
        payment_date_text = element(elements, BPR_PAYMENT_DATE_INDEX)
        if payment_date_text != "":
            transaction.payment_date = parse_x12_date(payment_date_text)
    elif segment_id == "TRN":
        transaction.trace_number = element(elements, 2) or None
    elif segment_id == "N1":
        _read_name(elements, state, transaction)
    elif segment_id == "REF":
        _read_reference(elements, state, transaction)
    elif segment_id == "CLP":
        start_claim(elements, state, transaction)
    elif segment_id == "CAS":
        read_adjustments(elements, state)
    elif segment_id == "MOA":
        read_claim_remarks(elements, state)
    elif segment_id == "LQ":
        read_line_remark(elements, state)
    elif segment_id == "DTM":
        read_date(elements, state)
    elif segment_id == "SVC":
        start_service_line(elements, separators, state)
    elif segment_id == "PLB":
        # Provider-level adjustments come after the last claim.
        state.claim = None
        state.line = None
    return None


def _start_transaction(elements: list[str], state: ParseState) -> str | None:
    if state.transaction is not None:
        _finish_transaction(state)
        add_warning(state, INCOMPLETE_FILE_WARNING)

    transaction_type = element(elements, 1)
    if transaction_type != REMITTANCE_TRANSACTION_TYPE:
        known_message = OTHER_TRANSACTION_MESSAGES.get(transaction_type)
        if known_message is not None:
            return known_message
        return (
            f"This is an X12 {transaction_type} file, not an 835 remittance."
            " Upload the 835 you got back from the payer."
        )

    state.transaction = Transaction835(
        payer_name="", payer_identifier=None, payment_date=None, trace_number=None, claims=[]
    )
    state.segments_in_transaction = 1
    return None


def _end_transaction(elements: list[str], state: ParseState) -> None:
    if state.transaction is None:
        add_warning(state, INCOMPLETE_FILE_WARNING)
        return
    declared_count_text = element(elements, 1)
    if not declared_count_text.isdigit() or int(declared_count_text) != (
        state.segments_in_transaction
    ):
        add_warning(state, SEGMENT_COUNT_WARNING)
    _finish_transaction(state)


def _finish_transaction(state: ParseState) -> None:
    if state.transaction is not None:
        state.transactions.append(state.transaction)
    state.transaction = None
    state.claim = None
    state.line = None
    state.in_payer_loop = False


def _read_name(elements: list[str], state: ParseState, transaction: Transaction835) -> None:
    is_payer = element(elements, 1) == PAYER_ENTITY_CODE
    state.in_payer_loop = is_payer and state.claim is None
    if state.in_payer_loop:
        transaction.payer_name = element(elements, 2)


def _read_reference(elements: list[str], state: ParseState, transaction: Transaction835) -> None:
    qualifier = element(elements, 1)
    reference = element(elements, 2)
    if state.in_payer_loop and qualifier == PAYER_IDENTIFIER_QUALIFIER:
        transaction.payer_identifier = reference or None
    elif state.line is not None and qualifier == LINE_ITEM_CONTROL_QUALIFIER and reference != "":
        state.line.line_ref = reference
