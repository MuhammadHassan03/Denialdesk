"""The only module that talks to an LLM.

Every reply carries the model name and token counts, and the caller parses the
output into a Pydantic model before anything else sees it.
"""

import logging
from typing import Protocol

import anthropic
from pydantic import BaseModel

logger = logging.getLogger(__name__)

LLM_TIMEOUT_SECONDS = 60
MAX_OUTPUT_TOKENS = 4000
TOKENS_PER_PRICE_UNIT = 1_000_000


class LlmSettings(BaseModel):
    api_key: str
    model_name: str
    input_cents_per_million_tokens: int
    output_cents_per_million_tokens: int


class LlmRequest(BaseModel):
    system_prompt: str
    user_message: str
    output_name: str
    output_description: str
    output_schema: dict[str, object]


class LlmReply(BaseModel):
    output: dict[str, object]
    model_name: str
    input_tokens: int
    output_tokens: int


class DraftWriter(Protocol):
    def write(self, request: LlmRequest) -> LlmReply | None:
        """Return the model's structured output, or None when the call failed."""
        ...


def cost_cents(input_tokens: int, output_tokens: int, settings: LlmSettings) -> int:
    """Whole cents, rounded up, so a draft never records a cost of zero by rounding."""
    price_units = (
        input_tokens * settings.input_cents_per_million_tokens
        + output_tokens * settings.output_cents_per_million_tokens
    )
    whole_cents, remainder = divmod(price_units, TOKENS_PER_PRICE_UNIT)
    if remainder > 0:
        return whole_cents + 1
    return whole_cents


class AnthropicDraftWriter:
    def __init__(self, settings: LlmSettings) -> None:
        self._model_name = settings.model_name
        # Retries are decided by the caller, which also counts them.
        self._client = anthropic.Anthropic(
            api_key=settings.api_key, timeout=LLM_TIMEOUT_SECONDS, max_retries=0
        )

    def write(self, request: LlmRequest) -> LlmReply | None:
        try:
            message = self._client.messages.create(
                model=self._model_name,
                max_tokens=MAX_OUTPUT_TOKENS,
                system=request.system_prompt,
                messages=[{"role": "user", "content": request.user_message}],
                tools=[
                    {
                        "name": request.output_name,
                        "description": request.output_description,
                        "input_schema": request.output_schema,
                    }
                ],
                tool_choice={"type": "tool", "name": request.output_name},
            )
        except anthropic.APIError as error:
            # The error type only. Its text can echo the request, which holds claim details.
            logger.warning("llm call failed error_type=%s", type(error).__name__)
            return None

        for block in message.content:
            if block.type == "tool_use" and isinstance(block.input, dict):
                return LlmReply(
                    output=block.input,
                    model_name=message.model,
                    input_tokens=message.usage.input_tokens,
                    output_tokens=message.usage.output_tokens,
                )
        logger.warning("llm reply had no structured output stop_reason=%s", message.stop_reason)
        return None
