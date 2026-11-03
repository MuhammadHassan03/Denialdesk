from denialdesk_pipeline.rank.priority import priority_bucket, rank_key

TODAY = "2026-11-04"


def test_buckets_by_days_left() -> None:
    assert priority_bucket("2026-11-03", TODAY) == "overdue"
    assert priority_bucket("2026-11-04", TODAY) == "due_within_7"
    assert priority_bucket("2026-11-11", TODAY) == "due_within_7"
    assert priority_bucket("2026-11-12", TODAY) == "due_within_30"
    assert priority_bucket("2026-12-04", TODAY) == "due_within_30"
    assert priority_bucket("2026-12-05", TODAY) == "due_later"


def test_larger_amount_ranks_first() -> None:
    large = rank_key(120000, "2026-12-01", "b")
    small = rank_key(9000, "2026-11-20", "a")

    assert sorted([small, large]) == [large, small]


def test_same_amount_earlier_deadline_ranks_first() -> None:
    later = rank_key(5000, "2026-12-01", "a")
    earlier = rank_key(5000, "2026-11-20", "b")

    assert sorted([later, earlier]) == [earlier, later]


def test_id_breaks_ties_so_order_is_stable() -> None:
    second = rank_key(5000, "2026-12-01", "b")
    first = rank_key(5000, "2026-12-01", "a")

    assert sorted([second, first]) == [first, second]
