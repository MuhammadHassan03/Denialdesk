"""FastAPI routes the web app calls. Only the web app's server code talks to this API."""

from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from denialdesk_pipeline.codes.carc import find_carc_meaning, load_carc_meanings
from denialdesk_pipeline.codes.supported_codes import denial_code, is_supported_denial_code

app = FastAPI(title="Denialdesk pipeline")

GROUP_CODE_LENGTH = 2
HTTP_NOT_FOUND = 404


class HealthResponse(BaseModel):
    status: Literal["ok"]


class CodeMeaningResponse(BaseModel):
    code: str
    official_text: str
    plain_english: str
    supported: bool


@app.get("/health")
def read_health() -> HealthResponse:
    return HealthResponse(status="ok")


@app.get("/codes/{code}")
def read_code_meaning(code: str) -> CodeMeaningResponse:
    """Meaning of a denial code written as group and CARC, for example CO-197."""
    group_code, separator, carc_code = code.upper().partition("-")
    is_well_formed = (
        separator == "-"
        and len(group_code) == GROUP_CODE_LENGTH
        and group_code.isalpha()
        and carc_code.isalnum()
    )
    if not is_well_formed:
        raise HTTPException(status_code=HTTP_NOT_FOUND, detail="Unknown code")

    meaning = find_carc_meaning(carc_code, load_carc_meanings())
    if meaning is None:
        raise HTTPException(status_code=HTTP_NOT_FOUND, detail="Unknown code")
    return CodeMeaningResponse(
        code=denial_code(group_code, carc_code),
        official_text=meaning.official_text,
        plain_english=meaning.plain_english,
        supported=is_supported_denial_code(group_code, carc_code),
    )
