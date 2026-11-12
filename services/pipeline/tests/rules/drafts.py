"""Synthetic drafts and context shared by the rules tests. Every value is made up."""

from typing import Any

from denialdesk_pipeline.rules.models import (
    DenialForCheck,
    NcciEdit,
    PolicyForCheck,
    RulesContext,
)

TODAY = "2026-11-04"
POLICY_TEXT = (
    "Services performed within the approved authorization period are eligible for payment. "
    "Requests for reconsideration must include the authorization number."
)


def context(
    code: str = "CO-197",
    biller_facts: dict[str, str] | None = None,
    policies: list[PolicyForCheck] | None = None,
    ncci_edits: list[NcciEdit] | None = None,
    appeal_deadline: str = "2026-12-01",
    other_procedure_codes: list[str] | None = None,
) -> RulesContext:
    if policies is None:
        policies = [
            PolicyForCheck(policy_id="NW-PA-2026-04", effective_date="2026-01-01", text=POLICY_TEXT)
        ]
    return RulesContext(
        denial=DenialForCheck(
            code=code,
            patient_control_number="CLM-20517",
            payer_claim_control_number="7716204918",
            service_date="2026-09-09",
            amount_at_stake_cents=231000,
            appeal_deadline=appeal_deadline,
            line_modifiers=[],
            other_procedure_codes_on_claim=other_procedure_codes or [],
        ),
        biller_facts=biller_facts or {},
        policies=policies,
        ncci_edits=ncci_edits or [],
        today=TODAY,
    )


def claim_references() -> dict[str, Any]:
    return {
        "patient_control_number": "CLM-20517",
        "payer_claim_control_number": "7716204918",
        "service_date": "2026-09-09",
        "amount_at_stake_cents": 231000,
    }


def appeal(**overrides: Any) -> dict[str, Any]:
    letter: dict[str, Any] = {
        "action": "appeal",
        "recipient_block": "Northwind Health\nAppeals Department",
        "subject_line": "Appeal of claim 7716204918",
        "claim_references": claim_references(),
        "appeal_summary": "We are appealing the CO-197 denial of this claim.",
        "argument": (
            "Authorization AUTH-88213 was issued before the service. Your policy states "
            '"Services performed within the approved authorization period are eligible '
            'for payment."'
        ),
        "citations": [{"policy_id": "NW-PA-2026-04", "quote": None}],
        "requested_outcome": "Please reprocess and pay the claim.",
        "attachments": ["Authorization approval AUTH-88213"],
        "sign_off_block": "Sincerely,\n[BILLER NAME]",
        "stated_facts": {},
    }
    letter.update(overrides)
    return letter


def corrected_claim(**overrides: Any) -> dict[str, Any]:
    claim: dict[str, Any] = {
        "action": "corrected_claim",
        "frequency_code": "7",
        "original_payer_claim_control_number": "7716204918",
        "claim_references": claim_references(),
        "changes": [
            {
                "field": "modifier",
                "old_value": "",
                "new_value": "25",
                "reason": "The visit was separate from the procedure on the same day.",
            }
        ],
        "stated_facts": {},
    }
    claim.update(overrides)
    return claim
