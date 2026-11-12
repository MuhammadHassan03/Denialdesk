"""Worker settings, read once from the environment at start-up."""

import os
from pathlib import Path

from pydantic import BaseModel

from denialdesk_pipeline.draft.llm_client import LlmSettings
from denialdesk_pipeline.intake.stored_file import decode_encryption_key


class WorkerSettings(BaseModel):
    database_url: str
    storage_dir: Path
    encryption_key: bytes
    # None when the LLM variables aren't set. Uploads still work; drafting doesn't.
    llm: LlmSettings | None = None


LLM_VARIABLE_NAMES = (
    "ANTHROPIC_API_KEY",
    "LLM_MODEL",
    "LLM_INPUT_CENTS_PER_MILLION_TOKENS",
    "LLM_OUTPUT_CENTS_PER_MILLION_TOKENS",
)


def read_llm_settings() -> LlmSettings | None:
    for name in LLM_VARIABLE_NAMES:
        if os.environ.get(name, "") == "":
            return None
    return LlmSettings(
        api_key=os.environ["ANTHROPIC_API_KEY"],
        model_name=os.environ["LLM_MODEL"],
        input_cents_per_million_tokens=int(os.environ["LLM_INPUT_CENTS_PER_MILLION_TOKENS"]),
        output_cents_per_million_tokens=int(os.environ["LLM_OUTPUT_CENTS_PER_MILLION_TOKENS"]),
    )


def read_worker_settings() -> WorkerSettings:
    missing_names: list[str] = []
    for name in ("DATABASE_URL", "STORAGE_DIR", "FILE_ENCRYPTION_KEY"):
        if os.environ.get(name, "") == "":
            missing_names.append(name)
    if missing_names:
        raise RuntimeError(f"Worker environment is missing: {', '.join(missing_names)}")
    return WorkerSettings(
        database_url=os.environ["DATABASE_URL"],
        storage_dir=Path(os.environ["STORAGE_DIR"]),
        encryption_key=decode_encryption_key(os.environ["FILE_ENCRYPTION_KEY"]),
        llm=read_llm_settings(),
    )
