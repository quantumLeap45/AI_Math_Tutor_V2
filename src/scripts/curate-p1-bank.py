#!/usr/bin/env python3
"""
curate-p1-bank.py
AI Math Tutor v2

Samples 220 questions evenly from the two P1 source files (ACS + SCGS),
balanced across topics and difficulty levels.

Output: src/data/quiz-p1-bank.json
"""

import json
import random
import os
import sys
from pathlib import Path

# ── Paths ────────────────────────────────────────────────────────────────────

SCRIPT_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPT_DIR.parent.parent  # ai-math-tutor-v2/
DATA_DIR = PROJECT_ROOT / "src" / "data"

SOURCE_ACS = Path("/Users/javensoh/Downloads/math_papers_markdown/2022 P1 Math ACS paper.json")
SOURCE_SCGS = Path("/Users/javensoh/Downloads/math_papers_markdown/2022 P1 Math SCGS paper.json")
OUTPUT_FILE = DATA_DIR / "quiz-p1-bank.json"

# ── Sampling targets ──────────────────────────────────────────────────────────
#
# Topic               | Source      | Total available | Sample target
# --------------------|-------------|-----------------|---------------
# Multiplication/Div  | ACS + SCGS  | 630             | 40
# Picture Graphs      | ACS         | 180             | 40
# Addition/Subtraction| ACS         | 30              | 30 (all)
# Whole Numbers       | ACS         | 30              | 30 (all)
# Time                | SCGS        | 120             | 40
# Money               | SCGS        | 180             | 40
# TOTAL                             | 1,170           | 220
#
# Per-topic difficulty split: 13 easy, 13 medium, 14 hard (where possible)

SAMPLING_PLAN = [
    # (topic, sources_to_use, n_easy, n_medium, n_hard)
    ("Multiplication/Division", ["ACS", "SCGS"], 13, 13, 14),
    ("Picture Graphs",          ["ACS"],          13, 13, 14),
    ("Addition/Subtraction",    ["ACS"],          10, 10, 10),   # only 30 available
    ("Whole Numbers",           ["ACS"],          10, 10, 10),   # only 30 available
    ("Time",                    ["SCGS"],         13, 13, 14),
    ("Money",                   ["SCGS"],         13, 13, 14),
]


def load_source(path: Path) -> list[dict]:
    """Load a JSON question file."""
    print(f"  Loading {path.name} … ", end="", flush=True)
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    print(f"{len(data)} questions")
    return data


def sample_by_difficulty(
    pool: list[dict],
    n_easy: int,
    n_medium: int,
    n_hard: int,
    rng: random.Random,
) -> list[dict]:
    """
    Draw n_easy / n_medium / n_hard questions from pool.
    If a difficulty bucket doesn't have enough, takes as many as available.
    """
    by_diff: dict[str, list[dict]] = {"easy": [], "medium": [], "hard": []}
    for q in pool:
        d = q.get("difficulty", "").lower()
        if d in by_diff:
            by_diff[d].append(q)

    sampled: list[dict] = []
    for diff, target in [("easy", n_easy), ("medium", n_medium), ("hard", n_hard)]:
        bucket = by_diff[diff]
        rng.shuffle(bucket)
        sampled.extend(bucket[:target])

    return sampled


def main():
    seed = 42
    rng = random.Random(seed)

    print("=== P1 Question Bank Curation ===\n")
    print("Loading source files …")

    acs_questions = load_source(SOURCE_ACS)
    scgs_questions = load_source(SOURCE_SCGS)

    # Index by source label for the sampling plan
    source_map: dict[str, list[dict]] = {
        "ACS": acs_questions,
        "SCGS": scgs_questions,
    }

    # Validate that all IDs are unique across sources
    all_ids = [q["id"] for q in acs_questions + scgs_questions]
    if len(all_ids) != len(set(all_ids)):
        print("[WARNING] Duplicate IDs found across source files – check carefully.")

    print("\nSampling …")
    selected: list[dict] = []

    for topic, sources, n_easy, n_medium, n_hard in SAMPLING_PLAN:
        # Build combined pool for this topic
        pool: list[dict] = []
        for src_label in sources:
            pool.extend(
                q for q in source_map[src_label] if q["topic"] == topic
            )

        batch = sample_by_difficulty(pool, n_easy, n_medium, n_hard, rng)
        actual_total = len(batch)
        actual_by_diff = {
            d: sum(1 for q in batch if q["difficulty"] == d)
            for d in ("easy", "medium", "hard")
        }
        print(
            f"  {topic:<30} {actual_total:>3} questions "
            f"(easy:{actual_by_diff['easy']}  "
            f"medium:{actual_by_diff['medium']}  "
            f"hard:{actual_by_diff['hard']})"
        )
        selected.extend(batch)

    # Final shuffle so topics are interleaved, not grouped
    rng.shuffle(selected)

    # Write output
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(selected, f, indent=2, ensure_ascii=False)

    # Summary
    print(f"\n=== CURATION COMPLETE ===")
    print(f"Total questions sampled : {len(selected)}")
    print(f"Output written to       : {OUTPUT_FILE}")

    by_topic = {}
    by_diff = {}
    for q in selected:
        by_topic[q["topic"]] = by_topic.get(q["topic"], 0) + 1
        by_diff[q["difficulty"]] = by_diff.get(q["difficulty"], 0) + 1

    print("\nBreakdown by topic:")
    for t, n in sorted(by_topic.items()):
        print(f"  {t:<35} {n}")

    print("\nBreakdown by difficulty:")
    for d, n in sorted(by_diff.items()):
        print(f"  {d:<10} {n}")


if __name__ == "__main__":
    main()
