"""The draft_denial job: one denial in status "drafting" to stored, rules-checked draft versions."""

import logging
from uuid import UUID

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb
from pydantic import BaseModel

from denialdesk_pipeline.codes.carc import find_carc_meaning, load_carc_meanings
from denialdesk_pipeline.codes.supported_codes import denial_code
from denialdesk_pipeline.draft.draft_input import DenialForDraft, DraftInput
from denialdesk_pipeline.draft.llm_client import DraftWriter, LlmSettings, cost_cents
from denialdesk_pipeline.draft.prompt_files import DraftAction, Prompt, load_prompt
from denialdesk_pipeline.draft.write_draft import CheckedDraft, write_checked_drafts
from denialdesk_pipeline.jobs.biller_clock import biller_today
from denialdesk_pipeline.jobs.job_queue import DRAFT_FAILED_MESSAGE, ClaimedJob, mark_job_done
from denialdesk_pipeline.rules.models import DenialForCheck, NcciEdit, PolicyForCheck, RulesContext

logger = logging.getLogger(__name__)

NO_MEANING_ON_FILE = "No description on file for this code."

Cursor = psycopg.Cursor[dict[str, object]]


class DenialToDraft(BaseModel):
    denial_id: UUID
    organization_id: UUID
    payer_id: UUID
    payer_name: str
    status: str
    group_code: str
    carc_code: str
    rarc_codes: list[str]
    patient_control_number: str
    payer_claim_control_number: str
    service_date: str | None
    amount_at_stake_cents: int
    appeal_deadline: str
    procedure_code: str | None
    procedure_modifiers: list[str]
    line_charge_cents: int | None
    line_paid_cents: int | None
    biller_facts: dict[str, str] | None
    draft_action: DraftAction | None


LOAD_DENIAL_SQL = """
SELECT d.id AS denial_id, d.organization_id, d.payer_id, p.name AS payer_name, d.status,
    d.group_code, d.carc_code, d.rarc_codes, d.patient_control_number,
    d.payer_claim_control_number, d.service_date::text AS service_date, d.amount_at_stake_cents,
    d.appeal_deadline::text AS appeal_deadline, d.procedure_code, d.procedure_modifiers,
    d.line_charge_cents, d.line_paid_cents, d.biller_facts, d.draft_action
FROM denials d JOIN payers p ON p.id = d.payer_id
WHERE d.id = %s
"""


def draft_denial_job(
    connection: psycopg.Connection,
    job: ClaimedJob,
    llm_settings: LlmSettings | None,
    draft_writer: DraftWriter | None,
) -> None:
    if job.denial_id is None:
        raise ValueError("draft_denial job has no denial id")
    denial = _load_denial(connection, job.denial_id)
    if denial.status != "drafting" or denial.draft_action is None or denial.biller_facts is None:
        logger.info("draft skipped, denial not waiting for one denial_id=%s", denial.denial_id)
        _finish_without_draft(connection, job, None)
        return
    if llm_settings is None or draft_writer is None:
        logger.error("draft failed, LLM settings are missing denial_id=%s", denial.denial_id)
        _finish_without_draft(connection, job, DRAFT_FAILED_MESSAGE)
        return

    code = denial_code(denial.group_code, denial.carc_code)
    policies = _load_policies(connection, denial, code)
    other_procedure_codes = _other_procedure_codes(connection, denial)
    rules_context = RulesContext(
        denial=DenialForCheck(
            code=code,
            patient_control_number=denial.patient_control_number,
            payer_claim_control_number=denial.payer_claim_control_number,
            service_date=denial.service_date,
            amount_at_stake_cents=denial.amount_at_stake_cents,
            appeal_deadline=denial.appeal_deadline,
            line_modifiers=denial.procedure_modifiers,
            other_procedure_codes_on_claim=other_procedure_codes,
        ),
        biller_facts=denial.biller_facts,
        policies=policies,
        ncci_edits=_load_ncci_edits(connection, other_procedure_codes),
        today=biller_today(connection, denial.organization_id),
    )
    draft_input = DraftInput(
        action=denial.draft_action,
        denial=_denial_for_draft(denial, code),
        biller_facts=denial.biller_facts,
        policies=policies,
    )
    prompt = load_prompt(denial.draft_action)

    checked_drafts = write_checked_drafts(draft_writer, draft_input, prompt, rules_context)
    if not checked_drafts:
        logger.warning("draft failed, no usable model output denial_id=%s", denial.denial_id)
        _finish_without_draft(connection, job, DRAFT_FAILED_MESSAGE)
        return

    with connection.transaction(), connection.cursor(row_factory=dict_row) as cursor:
        for checked_draft in checked_drafts:
            _save_draft(cursor, denial, checked_draft, prompt, llm_settings)
        cursor.execute(
            """
            UPDATE denials SET status = 'in_review', draft_failure_message = NULL,
                updated_at = now()
            WHERE id = %s
            """,
            (denial.denial_id,),
        )
        mark_job_done(cursor, job.job_id)
    logger.info(
        "draft saved job_id=%s denial_id=%s versions=%s overall=%s",
        job.job_id,
        denial.denial_id,
        len(checked_drafts),
        checked_drafts[-1].rules_check.overall,
    )


def _load_denial(connection: psycopg.Connection, denial_id: UUID) -> DenialToDraft:
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(LOAD_DENIAL_SQL, (denial_id,))
        denial_row = cursor.fetchone()
    connection.commit()
    if denial_row is None:
        raise ValueError("Denial for job not found")
    return DenialToDraft.model_validate(denial_row)


def _denial_for_draft(denial: DenialToDraft, code: str) -> DenialForDraft:
    code_meaning = NO_MEANING_ON_FILE
    meaning = find_carc_meaning(denial.carc_code, load_carc_meanings())
    if meaning is not None:
        code_meaning = meaning.plain_english
    return DenialForDraft(
        code=code,
        code_meaning=code_meaning,
        payer_name=denial.payer_name,
        patient_control_number=denial.patient_control_number,
        payer_claim_control_number=denial.payer_claim_control_number,
        service_date=denial.service_date,
        amount_at_stake_cents=denial.amount_at_stake_cents,
        rarc_codes=denial.rarc_codes,
        procedure_code=denial.procedure_code,
        procedure_modifiers=denial.procedure_modifiers,
        line_charge_cents=denial.line_charge_cents,
        line_paid_cents=denial.line_paid_cents,
    )


def _load_policies(
    connection: psycopg.Connection, denial: DenialToDraft, code: str
) -> list[PolicyForCheck]:
    """The newest version of each policy for this payer and code that is already in effect."""
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            """
            SELECT DISTINCT ON (policy_id) policy_id, effective_date::text AS effective_date,
                policy_text AS text
            FROM payer_policies
            WHERE payer_id = %s AND denial_code = %s AND effective_date <= CURRENT_DATE
            ORDER BY policy_id, effective_date DESC
            """,
            (denial.payer_id, code),
        )
        policy_rows = cursor.fetchall()
    connection.commit()
    return [PolicyForCheck.model_validate(policy_row) for policy_row in policy_rows]


def _other_procedure_codes(connection: psycopg.Connection, denial: DenialToDraft) -> list[str]:
    """Procedure codes on the same claim that we know of: the ones on its other denials."""
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT DISTINCT procedure_code FROM denials
            WHERE payer_id = %s AND payer_claim_control_number = %s AND id <> %s
                AND procedure_code IS NOT NULL
            ORDER BY procedure_code
            """,
            (denial.payer_id, denial.payer_claim_control_number, denial.denial_id),
        )
        code_rows = cursor.fetchall()
    connection.commit()
    return [str(code_row[0]) for code_row in code_rows]


def _load_ncci_edits(connection: psycopg.Connection, procedure_codes: list[str]) -> list[NcciEdit]:
    if not procedure_codes:
        return []
    with connection.cursor(row_factory=dict_row) as cursor:
        cursor.execute(
            """
            SELECT column_one_code, column_two_code, modifier_allowed FROM ncci_edits
            WHERE column_one_code = ANY(%s) OR column_two_code = ANY(%s)
            """,
            (procedure_codes, procedure_codes),
        )
        edit_rows = cursor.fetchall()
    connection.commit()
    return [NcciEdit.model_validate(edit_row) for edit_row in edit_rows]


def _save_draft(
    cursor: Cursor,
    denial: DenialToDraft,
    checked_draft: CheckedDraft,
    prompt: Prompt,
    llm_settings: LlmSettings,
) -> None:
    cursor.execute(
        "SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM drafts WHERE denial_id = %s",
        (denial.denial_id,),
    )
    version_row = cursor.fetchone()
    if version_row is None:
        raise ValueError("Could not read the next draft version")
    version = version_row["next_version"]
    cursor.execute(
        """
        INSERT INTO drafts (denial_id, version, action, content, biller_facts, model_name,
            prompt_version, input_tokens, output_tokens, cost_cents)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            denial.denial_id,
            version,
            denial.draft_action,
            Jsonb(checked_draft.content),
            Jsonb(denial.biller_facts),
            checked_draft.model_name,
            prompt.version,
            checked_draft.input_tokens,
            checked_draft.output_tokens,
            cost_cents(checked_draft.input_tokens, checked_draft.output_tokens, llm_settings),
        ),
    )
    draft_row = cursor.fetchone()
    if draft_row is None:
        raise ValueError("Draft insert returned no row")
    rules_check = checked_draft.rules_check
    check_rows = [check.model_dump() for check in rules_check.checks]
    cursor.execute(
        "INSERT INTO rules_checks (draft_id, overall, checks) VALUES (%s, %s, %s)",
        (draft_row["id"], rules_check.overall, Jsonb(check_rows)),
    )
    for check in rules_check.checks:
        if check.crashed:
            logger.error(
                "rules check crashed check=%s denial_id=%s version=%s",
                check.name,
                denial.denial_id,
                version,
            )
    _record_event(
        cursor, denial, "draft_created", version, {"model_name": checked_draft.model_name}
    )
    _record_event(cursor, denial, "rules_checked", version, {"overall": rules_check.overall})


def _record_event(
    cursor: Cursor, denial: DenialToDraft, action: str, version: object, details: dict[str, str]
) -> None:
    cursor.execute(
        """
        INSERT INTO audit_events (organization_id, actor, denial_id, action, draft_version, details)
        VALUES (%s, 'system', %s, %s, %s, %s)
        """,
        (denial.organization_id, denial.denial_id, action, version, Jsonb(details)),
    )


def _finish_without_draft(
    connection: psycopg.Connection, job: ClaimedJob, failure_message: str | None
) -> None:
    """End the job. With a message, the denial goes back to "new" and keeps its facts."""
    with connection.transaction(), connection.cursor(row_factory=dict_row) as cursor:
        if failure_message is not None:
            cursor.execute(
                """
                UPDATE denials SET status = 'new', draft_failure_message = %s, updated_at = now()
                WHERE id = %s AND status = 'drafting'
                """,
                (failure_message, job.denial_id),
            )
        mark_job_done(cursor, job.job_id)
