from denialdesk_pipeline.draft.llm_client import LlmSettings, cost_cents

SETTINGS = LlmSettings(
    api_key="not-a-real-key",
    model_name="recorded-model",
    input_cents_per_million_tokens=300,
    output_cents_per_million_tokens=1500,
)


def test_cost_is_rounded_up_to_whole_cents() -> None:
    assert cost_cents(1_000_000, 1_000_000, SETTINGS) == 1800
    assert cost_cents(2000, 500, SETTINGS) == 2
    assert cost_cents(1, 0, SETTINGS) == 1
    assert cost_cents(0, 0, SETTINGS) == 0
