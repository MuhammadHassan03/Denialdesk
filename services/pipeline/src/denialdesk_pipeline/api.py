"""FastAPI routes the web app calls. Only the web app's server code talks to this API."""

from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="Denialdesk pipeline")


class HealthResponse(BaseModel):
    status: Literal["ok"]


@app.get("/health")
def read_health() -> HealthResponse:
    return HealthResponse(status="ok")
