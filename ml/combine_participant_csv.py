"""Combine participant CSV exports into one validated modeling dataset."""

from __future__ import annotations

import argparse
import csv
from datetime import datetime, timedelta
from pathlib import Path

EXPECTED_COLUMNS = [
    "session_id",
    "participant_id",
    "start_time",
    "domain",
    "declared_intention",
    "intended_duration_minutes",
    "duration_seconds",
    "click_count",
    "scroll_count",
    "keyboard_activity_count",
    "idle_seconds",
    "focus_loss_count",
    "drift_label",
]


def read_participant_file(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as source:
        reader = csv.DictReader(source)
        if list(reader.fieldnames or []) != EXPECTED_COLUMNS:
            raise ValueError(f"{path.name} does not match the required schema")
        rows = list(reader)
    if any(row["participant_id"] != path.stem for row in rows):
        raise ValueError(f"{path.name} contains a different participant_id")
    return rows


def validate_rows(rows: list[dict[str, str]]) -> None:
    session_ids = [row["session_id"] for row in rows]
    if len(session_ids) != len(set(session_ids)):
        raise ValueError("Duplicate session_id values found across participant files")

    previous_end_by_participant: dict[str, datetime] = {}
    for row in sorted(rows, key=lambda item: (item["participant_id"], item["start_time"])):
        if any(row[column] == "" for column in EXPECTED_COLUMNS):
            raise ValueError(f"Incomplete row in session {row['session_id']}")
        start = datetime.fromisoformat(row["start_time"])
        duration = int(row["duration_seconds"])
        if duration < 0 or int(row["idle_seconds"]) > duration:
            raise ValueError(f"Invalid duration fields in session {row['session_id']}")
        if row["drift_label"] not in {"0", "1"}:
            raise ValueError(f"Non-binary drift_label in session {row['session_id']}")
        previous_end = previous_end_by_participant.get(row["participant_id"])
        if previous_end is not None and start < previous_end:
            raise ValueError(f"Overlapping sessions for {row['participant_id']}")
        previous_end_by_participant[row["participant_id"]] = start + timedelta(seconds=duration)


def combine(input_directory: Path, output_path: Path) -> tuple[int, int]:
    participant_files = sorted(input_directory.glob("*.csv"))
    if not participant_files:
        raise ValueError(f"No participant CSV files found in {input_directory}")

    source_rows = [row for path in participant_files for row in read_participant_file(path)]
    rows = [
        row
        for row in source_rows
        if all(row[column] != "" for column in EXPECTED_COLUMNS)
        and row["drift_label"] in {"0", "1"}
    ]
    excluded_count = len(source_rows) - len(rows)
    if not rows:
        raise ValueError("No complete binary-labeled sessions were found")
    rows.sort(key=lambda item: (item["participant_id"], item["start_time"]))
    validate_rows(rows)

    with output_path.open("w", newline="", encoding="utf-8") as output:
        writer = csv.DictWriter(output, fieldnames=EXPECTED_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)
    return len(rows), excluded_count


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--input",
        type=Path,
        required=True,
        help="Private directory containing participant CSV exports",
    )
    parser.add_argument(
        "--output",
        type=Path,
        required=True,
        help="Path for the combined CSV outside this repository",
    )
    args = parser.parse_args()
    row_count, excluded_count = combine(args.input.resolve(), args.output.resolve())
    print(f"Combined {row_count} sessions into {args.output.resolve()}")
    print(f"Excluded {excluded_count} incomplete or non-binary session rows")


if __name__ == "__main__":
    main()
