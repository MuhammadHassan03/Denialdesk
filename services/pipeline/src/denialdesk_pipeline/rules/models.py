"""What the rules check reads and what it returns. No I/O."""

from typing import Literal

from pydantic import BaseModel

CheckOutcome = Literal["pass", "warn", "fail"]


class DenialForCheck(BaseModel):
    code: str
    patient_control_number: str
    payer_claim_control_number: str
    service_date: str | None
    amount_at_stake_cents: int
    appeal_deadline: str
    line_modifiers: list[str]
    other_procedure_codes_on_claim: list[str]


class PolicyForCheck(BaseModel):
    policy_id: str
    effective_date: str
    text: str


class NcciEdit(BaseModel):
    column_one_code: str
    column_two_code: str
    modifier_allowed: bool


class RulesContext(BaseModel):
    denial: DenialForCheck
    biller_facts: dict[str, str]
    policies: list[PolicyForCheck]
    ncci_edits: list[NcciEdit]
    today: str


class RuleCheck(BaseModel):
    name: str
    outcome: CheckOutcome
    reason: str
    crashed: bool = False


class RulesCheckResult(BaseModel):
    overall: CheckOutcome
    checks: list[RuleCheck]


def passed(name: str) -> RuleCheck:
    return RuleCheck(name=name, outcome="pass", reason="")


def warned(name: str, reason: str) -> RuleCheck:
    return RuleCheck(name=name, outcome="warn", reason=reason)


def failed(name: str, reason: str) -> RuleCheck:
    return RuleCheck(name=name, outcome="fail", reason=reason)
