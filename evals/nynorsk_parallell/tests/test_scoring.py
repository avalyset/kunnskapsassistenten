# -*- coding: utf-8 -*-
"""Tests for scoring module."""

import json
from pathlib import Path

import pytest

from src.fasit import FasitPair
from src.scoring import (
    RepetitionScore,
    chrf_signature,
    score_blinded_dir,
    score_copy_baseline,
    score_translations,
    summarize,
)

FASIT = [
    FasitPair(
        id="npk-0001", nb="Jeg kommer ikke hjem i dag", nn="Eg kjem ikkje heim i dag"
    ),
    FasitPair(id="npk-0002", nb="Hun fikk en ny bok", nn="Ho fekk ei ny bok"),
]


class TestScoreTranslations:
    """Tests for score_translations function."""

    def test_score_translations_perfect_match_scores_100(self) -> None:
        """Test that the reference itself scores 100."""
        score = score_translations(FASIT, {pair.id: pair.nn for pair in FASIT})

        assert score.corpus_chrf == pytest.approx(100.0)
        assert score.mean_sentence_chrf == pytest.approx(100.0)
        assert score.empty_outputs == 0

    def test_score_translations_missing_output_scores_zero(self) -> None:
        """Test that a missing translation counts as empty and scores zero."""
        score = score_translations(FASIT, {"npk-0001": FASIT[0].nn})

        assert score.sentence_chrf["npk-0001"] == pytest.approx(100.0)
        assert score.sentence_chrf["npk-0002"] == 0.0
        assert score.empty_outputs == 1

    def test_score_translations_ranks_translation_above_copy(self) -> None:
        """Test that a Nynorsk translation scores higher than the Bokmål source."""
        translated = score_translations(
            FASIT,
            {"npk-0001": "Eg kjem ikkje heim i dag", "npk-0002": "Ho fekk ei ny bok"},
        )
        copied = score_copy_baseline(FASIT)

        assert 0.0 < copied.corpus_chrf < translated.corpus_chrf


class TestScoreBlindedDir:
    """Tests for score_blinded_dir function."""

    def test_score_blinded_dir_scores_each_file_by_blind_id(
        self, tmp_path: Path
    ) -> None:
        """Test that every JSONL file is scored under its file name."""
        for blind_id, translations in {
            "aaa111": [pair.nn for pair in FASIT],
            "bbb222": [pair.nb for pair in FASIT],
        }.items():
            with open(tmp_path / f"{blind_id}.jsonl", "w", encoding="utf-8") as f:
                for pair, translation in zip(FASIT, translations):
                    f.write(
                        json.dumps({"id": pair.id, "translation": translation}) + "\n"
                    )

        scores = score_blinded_dir(FASIT, tmp_path)

        assert set(scores) == {"aaa111", "bbb222"}
        assert scores["aaa111"].corpus_chrf > scores["bbb222"].corpus_chrf


class TestSummarize:
    """Tests for summarize function."""

    def _score(self, corpus: float) -> RepetitionScore:
        return RepetitionScore(
            corpus_chrf=corpus,
            mean_sentence_chrf=corpus,
            sentence_chrf={},
            empty_outputs=1,
        )

    def test_summarize_mean_and_sample_std(self) -> None:
        """Test mean and sample standard deviation across repetitions."""
        summary = summarize([self._score(70.0), self._score(72.0), self._score(74.0)])

        assert summary.repetitions == 3
        assert summary.corpus_chrf_mean == pytest.approx(72.0)
        assert summary.corpus_chrf_std == pytest.approx(2.0)
        assert summary.empty_outputs == 3

    def test_summarize_single_repetition_has_zero_std(self) -> None:
        """Test that one repetition gives a standard deviation of zero."""
        assert summarize([self._score(70.0)]).corpus_chrf_std == 0.0

    def test_summarize_raises_without_repetitions(self) -> None:
        """Test that an empty list raises ValueError."""
        with pytest.raises(ValueError, match="without repetitions"):
            summarize([])


class TestChrfSignature:
    """Tests for chrf_signature function."""

    def test_chrf_signature_names_the_metric_configuration(self) -> None:
        """Test that the signature can be read without a previous scoring."""
        assert "nc:6" in chrf_signature()
