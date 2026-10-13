# -*- coding: utf-8 -*-
"""Reporter module for saving and printing evaluation results."""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Tuple

from src.scoring import COPY_BASELINE, ModelSummary, RepetitionScore, summarize

logger = logging.getLogger(__name__)


def unblind(
    scores: Dict[str, RepetitionScore], links: Dict[str, Tuple[str, int]]
) -> Dict[str, ModelSummary]:
    """
    Join blinded scores with the revealed key and summarize per model.

    Args:
        scores: Scores per blind id.
        links: Mapping from blind id to model name and repetition.

    Returns:
        Summary per model name, with repetitions in order.
    """
    per_model: Dict[str, List[Tuple[int, RepetitionScore]]] = {}
    for blind_id, score in scores.items():
        model_name, repetition = links[blind_id]
        per_model.setdefault(model_name, []).append((repetition, score))

    return {
        model_name: summarize([score for _, score in sorted(items, key=lambda x: x[0])])
        for model_name, items in per_model.items()
    }


def save_results(results: Dict[str, Any], path: Path) -> None:
    """
    Save the result file as JSON.

    Args:
        results: Result dictionary.
        path: Output path.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(results, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    logger.info(f"Saved results to {path}")


def format_table(results: Dict[str, Any]) -> str:
    """
    Format the results as a Markdown table, read from the result dictionary.

    Args:
        results: Result dictionary as written by save_results.

    Returns:
        Markdown table sorted by mean corpus chrF.
    """
    lines = [
        "| Modell | Modell-ID | chrF (snitt) | Std.avvik | Per gjentak | Tomme svar |",
        "|---|---|---|---|---|---|",
    ]
    rows = sorted(
        results["models"].items(),
        key=lambda item: item[1]["summary"]["corpus_chrf_mean"],
        reverse=True,
    )
    for name, entry in rows:
        summary = entry["summary"]
        per_repetition = ", ".join(
            f"{score:.2f}" for score in summary["corpus_chrf_per_repetition"]
        )
        lines.append(
            f"| {name} | `{entry['model']}` | {summary['corpus_chrf_mean']:.2f} "
            f"| {summary['corpus_chrf_std']:.2f} | {per_repetition} "
            f"| {summary['empty_outputs']} |"
        )

    baseline = results["baseline"][COPY_BASELINE]
    lines.append(
        f"| Kopi av bokmål (ingen oversettelse) | | {baseline['corpus_chrf']:.2f} "
        "| | | 0 |"
    )
    return "\n".join(lines)


def print_summary(results: Dict[str, Any]) -> None:
    """
    Print the result table and the models that were not completed.

    Args:
        results: Result dictionary as written by save_results.
    """
    print(format_table(results))
    for name, status in results["not_completed"].items():
        print(f"Ikke fullført: {name} ({status})")
