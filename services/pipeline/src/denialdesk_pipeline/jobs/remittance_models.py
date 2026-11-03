"""The remittance row a process_remittance job works on."""

from uuid import UUID

from pydantic import BaseModel


class RemittanceToProcess(BaseModel):
    remittance_id: UUID
    organization_id: UUID
    source: str
    storage_uri: str
