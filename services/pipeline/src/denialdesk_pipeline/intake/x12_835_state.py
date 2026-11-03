"""Parse state shared by the 835 envelope reader and the claim loop reader."""

from dataclasses import dataclass, field

from denialdesk_pipeline.intake.x12_835_models import ClaimPayment, ServiceLine, Transaction835


@dataclass
class Separators:
    element: str
    sub_element: str
    segment: str


@dataclass
class ParseState:
    transactions: list[Transaction835] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    transaction: Transaction835 | None = None
    claim: ClaimPayment | None = None
    line: ServiceLine | None = None
    in_payer_loop: bool = False
    segments_in_transaction: int = 0
    saw_functional_group_end: bool = False
    saw_interchange_end: bool = False


def element(elements: list[str], index: int) -> str:
    if index >= len(elements):
        return ""
    return elements[index]


def add_warning(state: ParseState, warning: str) -> None:
    if warning not in state.warnings:
        state.warnings.append(warning)
