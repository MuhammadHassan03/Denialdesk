"""Loads the versioned prompt file for one draft action."""

from pathlib import Path
from typing import Literal

from pydantic import BaseModel

DraftAction = Literal["appeal", "corrected_claim"]

PROMPTS_DIR = Path(__file__).with_name("prompts")
PROMPT_VERSIONS: dict[DraftAction, str] = {
    "appeal": "appeal_v1",
    "corrected_claim": "corrected_claim_v1",
}


class Prompt(BaseModel):
    version: str
    text: str


def load_prompt(action: DraftAction) -> Prompt:
    version = PROMPT_VERSIONS[action]
    prompt_text = (PROMPTS_DIR / f"{version}.md").read_text(encoding="utf-8")
    return Prompt(version=version, text=prompt_text)
