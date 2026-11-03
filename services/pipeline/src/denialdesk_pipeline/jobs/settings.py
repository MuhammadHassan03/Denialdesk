"""Worker settings, read once from the environment at start-up."""

import os
from pathlib import Path

from pydantic import BaseModel

from denialdesk_pipeline.intake.stored_file import decode_encryption_key


class WorkerSettings(BaseModel):
    database_url: str
    storage_dir: Path
    encryption_key: bytes


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
    )
