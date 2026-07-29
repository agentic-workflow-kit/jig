#!/usr/bin/env python3
"""Validate authored eval metadata for the phase-delivery skill."""
import argparse
import json
import sys
from pathlib import Path


def fail(message: str) -> None:
    raise ValueError(message)


def load(path: Path) -> object:
    try:
        return json.loads(path.read_text())
    except FileNotFoundError as error:
        raise ValueError(f"missing {path}") from error
    except json.JSONDecodeError as error:
        raise ValueError(f"invalid JSON in {path}: {error.msg}") from error


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("skill", nargs="?", default=Path(__file__).resolve().parents[1], type=Path)
    args = parser.parse_args()
    root = args.skill.resolve()
    evals = load(root / "evals" / "evals.json")
    queries = load(root / "evals" / "trigger_queries.json")
    if not isinstance(evals, dict):
        fail("evals.json must contain an object")
    if evals.get("skill_name") != "orchestrate-phase-delivery":
        fail("evals skill_name must match skill")
    cases = evals.get("evals")
    if not isinstance(cases, list) or len(cases) != 3:
        fail("evals must contain exactly 3 output cases")
    required_text = ("id", "prompt", "expected_output")
    if any(
        not isinstance(case, dict)
        or any(not isinstance(case.get(field), str) or not case[field] for field in required_text)
        or not isinstance(case.get("files"), list)
        or any(not isinstance(path, str) or not path for path in case["files"])
        or not isinstance(case.get("assertions"), list)
        or not case["assertions"]
        or any(not isinstance(assertion, str) or not assertion for assertion in case["assertions"])
        for case in cases
    ):
        fail("each output case needs nonempty id, prompt, expected_output, assertions, and a files array")
    case_ids = [case["id"] for case in cases]
    if len(set(case_ids)) != len(case_ids):
        fail("output eval IDs must be unique")
    if not isinstance(queries, list) or len(queries) != 20:
        fail("trigger queries must contain exactly 20 cases")
    ids = [query.get("id") for query in queries if isinstance(query, dict)]
    if (
        len(ids) != 20
        or any(not isinstance(value, str) or not value for value in ids)
        or len(set(ids)) != 20
    ):
        fail("trigger query IDs must be unique nonempty strings")
    if any(
        not isinstance(q, dict)
        or not isinstance(q.get("query"), str)
        or not q["query"]
        or not isinstance(q.get("should_trigger"), bool)
        or q.get("split") not in {"train", "validation"}
        for q in queries
    ):
        fail("each trigger query needs query, boolean should_trigger, and train or validation split")
    if sum(q["should_trigger"] for q in queries) != 10:
        fail("trigger queries must have 10 positive and 10 negative cases")
    if {q["split"] for q in queries} != {"train", "validation"}:
        fail("trigger queries must include train and validation cases")
    print(
        json.dumps(
            {
                "valid": True,
                "output_evals": 3,
                "trigger_queries": 20,
                "positive": 10,
                "negative": 10,
            }
        )
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except ValueError as error:
        print(f"validation failed: {error}", file=sys.stderr)
        raise SystemExit(1)
