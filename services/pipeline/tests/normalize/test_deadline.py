from denialdesk_pipeline.normalize.deadline import compute_appeal_deadline


def test_uses_the_payer_window_when_stored() -> None:
    deadline = compute_appeal_deadline("2026-10-15", appeal_window_days=60)

    assert deadline.appeal_deadline == "2026-12-14"
    assert not deadline.is_estimate


def test_falls_back_to_the_default_window_as_an_estimate() -> None:
    deadline = compute_appeal_deadline("2026-10-15", appeal_window_days=None)

    assert deadline.appeal_deadline == "2027-01-13"
    assert deadline.is_estimate
