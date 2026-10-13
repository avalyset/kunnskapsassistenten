# -*- coding: utf-8 -*-
"""Unit tests for reporter module."""

from src.reporter import format_table, unblind
from src.scoring import COPY_BASELINE, RepetitionScore


def _score(corpus: float) -> RepetitionScore:
    return RepetitionScore(
        corpus_chrf=corpus, mean_sentence_chrf=corpus, sentence_chrf={}, empty_outputs=0
    )


class TestUnblind:
    """Tests for unblind function."""

    def test_unblind_groups_repetitions_per_model_in_order(self) -> None:
        """Test that blind ids are joined with the key and ordered by repetition."""
        scores = {"x1": _score(72.0), "x2": _score(70.0), "y1": _score(50.0)}
        links = {"x1": ("modell-a", 2), "x2": ("modell-a", 1), "y1": ("modell-b", 1)}

        summaries = unblind(scores, links)

        assert summaries["modell-a"].corpus_chrf_per_repetition == [70.0, 72.0]
        assert summaries["modell-b"].repetitions == 1


class TestFormatTable:
    """Tests for format_table function."""

    def test_format_table_sorts_models_and_adds_baseline(self) -> None:
        """Test that the table is sorted by chrF and ends with the copy baseline."""
        summaries = unblind(
            {"x1": _score(60.0), "y1": _score(80.0)},
            {"x1": ("svak", 1), "y1": ("sterk", 1)},
        )
        results = {
            "models": {
                name: {"model": f"id-{name}", "summary": summary.model_dump()}
                for name, summary in summaries.items()
            },
            "baseline": {COPY_BASELINE: {"corpus_chrf": 55.0}},
        }

        lines = format_table(results).splitlines()

        assert lines[2].startswith("| sterk | `id-sterk` | 80.00")
        assert lines[3].startswith("| svak |")
        assert lines[4].startswith("| Kopi av bokmål")
