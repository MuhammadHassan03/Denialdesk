from denialdesk_pipeline.draft.draft_input import DenialForDraft, DraftInput
from denialdesk_pipeline.draft.llm_client import LlmReply, LlmRequest
from denialdesk_pipeline.draft.prompt_files import load_prompt
from denialdesk_pipeline.draft.write_draft import write_checked_drafts
from tests.rules.drafts import appeal, context


class ScriptedWriter:
    """Gives back the scripted outputs in order and remembers what it was asked."""

    def __init__(self, outputs: list[dict[str, object] | None]) -> None:
        self._outputs = list(outputs)
        self.requests: list[LlmRequest] = []

    def write(self, request: LlmRequest) -> LlmReply | None:
        self.requests.append(request)
        output = self._outputs.pop(0)
        if output is None:
            return None
        return LlmReply(
            output=output, model_name="recorded-model", input_tokens=10, output_tokens=5
        )


DRAFT_INPUT = DraftInput(
    action="appeal",
    denial=DenialForDraft(
        code="CO-197",
        code_meaning="Authorization was missing.",
        payer_name="Northwind Health",
        patient_control_number="CLM-20517",
        payer_claim_control_number="7716204918",
        service_date="2026-09-09",
        amount_at_stake_cents=231000,
        rarc_codes=[],
        procedure_code=None,
        procedure_modifiers=[],
        line_charge_cents=None,
        line_paid_cents=None,
    ),
    biller_facts={},
    policies=context().policies,
)
BAD_QUOTE_ARGUMENT = 'AUTH-88213 applies. Your policy says "all claims are always paid."'


def write(writer: ScriptedWriter) -> list[str]:
    drafts = write_checked_drafts(writer, DRAFT_INPUT, load_prompt("appeal"), context())
    return [draft.rules_check.overall for draft in drafts]


def test_good_draft_is_one_call_and_one_version() -> None:
    writer = ScriptedWriter([appeal()])

    assert write(writer) == ["pass"]
    assert len(writer.requests) == 1


def test_failed_call_is_tried_once_more() -> None:
    assert write(ScriptedWriter([None, appeal()])) == ["pass"]


def test_two_failed_calls_give_no_draft() -> None:
    assert write(ScriptedWriter([None, None])) == []


def test_wrong_shape_is_sent_back_with_the_problem() -> None:
    writer = ScriptedWriter([{"action": "appeal"}, appeal()])

    assert write(writer) == ["pass"]
    assert "problems_in_your_last_draft" in writer.requests[1].user_message
    assert "claim_references" in writer.requests[1].user_message


def test_wrong_shape_twice_gives_no_draft() -> None:
    assert write(ScriptedWriter([{"action": "appeal"}, {"action": "appeal"}])) == []


def test_draft_that_fails_rules_is_asked_for_once_more_with_the_reasons() -> None:
    writer = ScriptedWriter([appeal(argument=BAD_QUOTE_ARGUMENT), appeal()])

    assert write(writer) == ["fail", "pass"]
    assert "Quotes are real" in writer.requests[1].user_message


def test_draft_that_fails_rules_twice_keeps_both_versions() -> None:
    bad_draft = appeal(argument=BAD_QUOTE_ARGUMENT)

    assert write(ScriptedWriter([bad_draft, bad_draft])) == ["fail", "fail"]


def test_corrected_claim_request_lists_the_fields_it_may_change() -> None:
    writer = ScriptedWriter([None, None])
    claim_input = DRAFT_INPUT.model_copy(update={"action": "corrected_claim"})
    claim_input.denial.code = "CO-4"

    write_checked_drafts(writer, claim_input, load_prompt("corrected_claim"), context(code="CO-4"))

    assert '"allowed_fields"' in writer.requests[0].user_message
    assert writer.requests[0].output_name == "corrected_claim"
