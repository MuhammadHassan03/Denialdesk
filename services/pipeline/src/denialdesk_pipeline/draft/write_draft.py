"""Asks the model for a draft and runs the rules check on it. The only I/O is the writer.

One draft costs at most four model calls: each ask may be tried twice (a failed
call or an output in the wrong shape), and a draft that fails the rules check
is asked for once more with the reasons.
"""

from pydantic import BaseModel, ValidationError

from denialdesk_pipeline.draft.draft_input import DraftInput, build_llm_request
from denialdesk_pipeline.draft.llm_client import DraftWriter, LlmReply
from denialdesk_pipeline.draft.models import AppealLetter, CorrectedClaim, Draft
from denialdesk_pipeline.draft.prompt_files import Prompt
from denialdesk_pipeline.rules.models import RulesCheckResult, RulesContext
from denialdesk_pipeline.rules.run_checks import check_parsed_draft

TRIES_PER_ASK = 2


class CheckedDraft(BaseModel):
    content: dict[str, object]
    rules_check: RulesCheckResult
    model_name: str
    input_tokens: int
    output_tokens: int


def _parse_draft(draft_input: DraftInput, output: dict[str, object]) -> Draft:
    if draft_input.action == "appeal":
        return AppealLetter.model_validate(output)
    return CorrectedClaim.model_validate(output)


def _shape_problems(error: ValidationError) -> list[str]:
    problems: list[str] = []
    for detail in error.errors(include_input=False, include_url=False):
        field_path = ".".join(str(part) for part in detail["loc"])
        problems.append(f"Output field {field_path}: {detail['msg']}")
    return problems


def _ask(
    writer: DraftWriter,
    draft_input: DraftInput,
    prompt: Prompt,
    rules_context: RulesContext,
    problems_to_fix: list[str],
) -> CheckedDraft | None:
    problems = list(problems_to_fix)
    for _ in range(TRIES_PER_ASK):
        reply: LlmReply | None = writer.write(build_llm_request(draft_input, prompt, problems))
        if reply is None:
            continue
        try:
            draft = _parse_draft(draft_input, reply.output)
        except ValidationError as error:
            problems = list(problems_to_fix) + _shape_problems(error)
            continue
        return CheckedDraft(
            content=reply.output,
            rules_check=check_parsed_draft(draft, rules_context),
            model_name=reply.model_name,
            input_tokens=reply.input_tokens,
            output_tokens=reply.output_tokens,
        )
    return None


def _failed_reasons(rules_check: RulesCheckResult) -> list[str]:
    reasons: list[str] = []
    for check in rules_check.checks:
        if check.outcome == "fail":
            reasons.append(f"{check.name}: {check.reason}")
    return reasons


def write_checked_drafts(
    writer: DraftWriter, draft_input: DraftInput, prompt: Prompt, rules_context: RulesContext
) -> list[CheckedDraft]:
    """Every draft version to store, oldest first. Empty when no usable draft came back."""
    first_draft = _ask(writer, draft_input, prompt, rules_context, [])
    if first_draft is None:
        return []
    if first_draft.rules_check.overall != "fail":
        return [first_draft]
    second_draft = _ask(
        writer, draft_input, prompt, rules_context, _failed_reasons(first_draft.rules_check)
    )
    if second_draft is None:
        return [first_draft]
    return [first_draft, second_draft]
