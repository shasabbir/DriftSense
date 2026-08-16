"""Reproducible, privacy-safe aggregate analysis for the DriftSense session CSVs.

The script uses only Python's standard library. It never writes row-level data;
the JSON output contains aggregate evidence for the companion report.
"""

from __future__ import annotations

import argparse
import collections
import csv
import json
import math
import random
import sqlite3
import statistics
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Callable, Iterable


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

INTEGER_COLUMNS = [
    "intended_duration_minutes",
    "duration_seconds",
    "click_count",
    "scroll_count",
    "keyboard_activity_count",
    "idle_seconds",
    "focus_loss_count",
    "drift_label",
]

ACTIVITY_COLUMNS = [
    "duration_seconds",
    "click_count",
    "scroll_count",
    "keyboard_activity_count",
    "idle_seconds",
    "focus_loss_count",
]

INTENTION_LABELS = {
    "accidental_open": "Accidental open",
    "communication_or_community": "Communication/community",
    "learning_or_tutorial": "Learning/tutorial",
    "open_ended_browsing": "Open-ended browsing",
    "planned_entertainment_or_break": "Planned entertainment/break",
    "specific_information": "Specific information",
    "work_or_study": "Work/study",
}

SOURCE_SQL = """SELECT
    session_id,
    participant_id,
    start_time,
    domain,
    declared_intention,
    intended_duration_minutes,
    duration_seconds,
    click_count,
    scroll_count,
    keyboard_activity_count,
    idle_seconds,
    focus_loss_count,
    drift_label,
    source_file
FROM session_exports
ORDER BY participant_id, start_time, session_id"""


def load_rows(input_dir: Path) -> tuple[list[dict], list[dict]]:
    raw_rows: list[dict] = []
    file_checks: list[dict] = []
    for path in sorted(input_dir.glob("*.csv")):
        with path.open(newline="", encoding="utf-8") as source:
            reader = csv.DictReader(source)
            schema_ok = list(reader.fieldnames or []) == EXPECTED_COLUMNS
            file_rows = list(reader)
        file_checks.append({"file": path.name, "schema_ok": schema_ok, "rows": len(file_rows)})
        for raw in file_rows:
            row = dict(raw)
            row["source_file"] = path.name
            raw_rows.append(row)
    if not raw_rows:
        raise ValueError(f"No participant CSV files found in {input_dir}")

    connection = sqlite3.connect(":memory:")
    connection.execute(
        """CREATE TABLE session_exports (
            session_id TEXT,
            participant_id TEXT,
            start_time TEXT,
            domain TEXT,
            declared_intention TEXT,
            intended_duration_minutes INTEGER,
            duration_seconds INTEGER,
            click_count INTEGER,
            scroll_count INTEGER,
            keyboard_activity_count INTEGER,
            idle_seconds INTEGER,
            focus_loss_count INTEGER,
            drift_label INTEGER,
            source_file TEXT
        )"""
    )
    insert_columns = EXPECTED_COLUMNS + ["source_file"]
    connection.executemany(
        f"INSERT INTO session_exports ({', '.join(insert_columns)}) VALUES ({', '.join('?' for _ in insert_columns)})",
        [[row[column] for column in insert_columns] for row in raw_rows],
    )
    cursor = connection.execute(SOURCE_SQL)
    selected_columns = [description[0] for description in cursor.description]
    selected_rows = [dict(zip(selected_columns, values)) for values in cursor.fetchall()]
    connection.close()

    rows: list[dict] = []
    for selected in selected_rows:
        row = dict(selected)
        row["_source_file"] = row.pop("source_file")
        row["start_time_dt"] = datetime.fromisoformat(row["start_time"])
        for column in INTEGER_COLUMNS:
            row[column] = int(row[column]) if row[column] not in {"", None} else None
        row["overrun_ratio"] = (
            row["duration_seconds"] / (60 * row["intended_duration_minutes"])
            if row["intended_duration_minutes"]
            else None
        )
        row["overrun_minutes"] = (
            row["duration_seconds"] - 60 * row["intended_duration_minutes"]
        ) / 60
        row["idle_share"] = row["idle_seconds"] / row["duration_seconds"]
        duration_minutes = row["duration_seconds"] / 60
        for column in [
            "click_count",
            "scroll_count",
            "keyboard_activity_count",
            "focus_loss_count",
        ]:
            row[f"{column}_per_min"] = row[column] / duration_minutes
        rows.append(row)
    return rows, file_checks


def rate(rows: Iterable[dict]) -> float:
    materialized = list(rows)
    return sum(row["drift_label"] for row in materialized) / len(materialized)


def percentile(values: list[float], q: float) -> float:
    ordered = sorted(values)
    position = (len(ordered) - 1) * q
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    fraction = position - lower
    return ordered[lower] * (1 - fraction) + ordered[upper] * fraction


def participant_bootstrap(
    rows: list[dict], statistic: Callable[[list[dict]], float], repeats: int = 4000
) -> list[float]:
    rng = random.Random(20260815)
    by_participant: dict[str, list[dict]] = collections.defaultdict(list)
    for row in rows:
        by_participant[row["participant_id"]].append(row)
    participant_ids = sorted(by_participant)
    samples: list[float] = []
    for _ in range(repeats):
        sampled_rows: list[dict] = []
        for participant_id in rng.choices(participant_ids, k=len(participant_ids)):
            sampled_rows.extend(by_participant[participant_id])
        try:
            samples.append(statistic(sampled_rows))
        except ZeroDivisionError:
            continue
    return samples


def interval(samples: list[float]) -> list[float]:
    return [percentile(samples, 0.025), percentile(samples, 0.975)]


def make_balanced_group_folds(rows: list[dict], fold_count: int = 6) -> list[list[str]]:
    counts = collections.Counter(row["participant_id"] for row in rows)
    folds: list[list[str]] = [[] for _ in range(fold_count)]
    fold_sizes = [0] * fold_count
    for participant_id, count in sorted(counts.items(), key=lambda item: (-item[1], item[0])):
        fold_index = min(range(fold_count), key=lambda index: (fold_sizes[index], index))
        folds[fold_index].append(participant_id)
        fold_sizes[fold_index] += count
    return folds


def roc_auc(y_true: list[int], scores: list[float]) -> float:
    ordered = sorted(zip(scores, y_true), key=lambda item: item[0])
    rank_sum = 0.0
    index = 0
    while index < len(ordered):
        end = index + 1
        while end < len(ordered) and ordered[end][0] == ordered[index][0]:
            end += 1
        average_rank = ((index + 1) + end) / 2
        rank_sum += average_rank * sum(label for _, label in ordered[index:end])
        index = end
    positives = sum(y_true)
    negatives = len(y_true) - positives
    return (rank_sum - positives * (positives + 1) / 2) / (positives * negatives)


def metric_values(y_true: list[int], scores: list[float], predictions: list[int]) -> dict:
    true_positive = sum(y == predicted == 1 for y, predicted in zip(y_true, predictions))
    true_negative = sum(y == predicted == 0 for y, predicted in zip(y_true, predictions))
    false_positive = sum(y == 0 and predicted == 1 for y, predicted in zip(y_true, predictions))
    false_negative = sum(y == 1 and predicted == 0 for y, predicted in zip(y_true, predictions))
    precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 0.0
    recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return {
        "accuracy": (true_positive + true_negative) / len(y_true),
        "precision": precision,
        "recall": recall,
        "f1": f1,
        "roc_auc": roc_auc(y_true, scores),
        "confusion": {
            "true_positive": true_positive,
            "true_negative": true_negative,
            "false_positive": false_positive,
            "false_negative": false_negative,
        },
    }


def best_f1_threshold(y_true: list[int], scores: list[float]) -> float:
    candidates = sorted(set(scores))
    if len(candidates) > 250:
        candidates = [percentile(candidates, index / 249) for index in range(250)]
    best = (-1.0, 0.5)
    for threshold in candidates:
        predictions = [int(score >= threshold) for score in scores]
        true_positive = sum(y == predicted == 1 for y, predicted in zip(y_true, predictions))
        false_positive = sum(y == 0 and predicted == 1 for y, predicted in zip(y_true, predictions))
        false_negative = sum(y == 1 and predicted == 0 for y, predicted in zip(y_true, predictions))
        precision = true_positive / (true_positive + false_positive) if true_positive + false_positive else 0
        recall = true_positive / (true_positive + false_negative) if true_positive + false_negative else 0
        value = 2 * precision * recall / (precision + recall) if precision + recall else 0
        if value > best[0]:
            best = (value, threshold)
    return best[1]


def raw_features(row: dict, kind: str, intentions: list[str]) -> tuple[list[float], int]:
    features: list[float] = []
    categorical_count = 0
    if kind in {"intention", "combined"}:
        features.extend(float(row["declared_intention"] == intention) for intention in intentions)
        categorical_count = len(intentions)
        features.append(math.log1p(row["intended_duration_minutes"]))
    if kind in {"activity", "combined"}:
        features.extend(math.log1p(row[column]) for column in ACTIVITY_COLUMNS)
    return features, categorical_count


def fit_logistic(rows: list[dict], kind: str, intentions: list[str]) -> tuple:
    raw = [raw_features(row, kind, intentions) for row in rows]
    vectors = [item[0] for item in raw]
    categorical_count = raw[0][1]
    means = [0.0] * len(vectors[0])
    standard_deviations = [1.0] * len(vectors[0])
    for column_index in range(categorical_count, len(vectors[0])):
        values = [vector[column_index] for vector in vectors]
        means[column_index] = sum(values) / len(values)
        variance = sum((value - means[column_index]) ** 2 for value in values) / len(values)
        standard_deviations[column_index] = math.sqrt(variance) or 1.0
    design = [
        [1.0]
        + [
            value
            if index < categorical_count
            else (value - means[index]) / standard_deviations[index]
            for index, value in enumerate(vector)
        ]
        for vector in vectors
    ]
    labels = [row["drift_label"] for row in rows]
    weights = [0.0] * len(design[0])
    for _ in range(1200):
        gradient = [0.0] * len(weights)
        for vector, label in zip(design, labels):
            linear = max(-30.0, min(30.0, sum(weight * value for weight, value in zip(weights, vector))))
            probability = 1 / (1 + math.exp(-linear))
            error = probability - label
            for index, value in enumerate(vector):
                gradient[index] += error * value
        for index in range(len(weights)):
            regularization = 0.0 if index == 0 else 0.002 * weights[index]
            weights[index] -= 0.15 * (gradient[index] / len(design) + regularization)
    return weights, means, standard_deviations, categorical_count


def predict_logistic(model: tuple, rows: list[dict], kind: str, intentions: list[str]) -> list[float]:
    weights, means, standard_deviations, categorical_count = model
    probabilities: list[float] = []
    for row in rows:
        values, _ = raw_features(row, kind, intentions)
        vector = [1.0] + [
            value
            if index < categorical_count
            else (value - means[index]) / standard_deviations[index]
            for index, value in enumerate(values)
        ]
        linear = max(-30.0, min(30.0, sum(weight * value for weight, value in zip(weights, vector))))
        probabilities.append(1 / (1 + math.exp(-linear)))
    return probabilities


def evaluate_models(rows: list[dict]) -> dict:
    folds = make_balanced_group_folds(rows)
    intentions = sorted({row["declared_intention"] for row in rows})
    model_names = ["majority", "time_threshold", "domain", "intention", "activity", "combined"]
    predictions = {
        name: {"y": [], "score": [], "predicted": [], "participant": []}
        for name in model_names
    }

    for held_out_participants in folds:
        train = [row for row in rows if row["participant_id"] not in held_out_participants]
        test = [row for row in rows if row["participant_id"] in held_out_participants]
        train_y = [row["drift_label"] for row in train]
        test_y = [row["drift_label"] for row in test]
        prior = sum(train_y) / len(train_y)

        majority_scores = [0.0] * len(test)
        predictions["majority"]["y"].extend(test_y)
        predictions["majority"]["score"].extend(majority_scores)
        predictions["majority"]["predicted"].extend([int(prior >= 0.5)] * len(test))
        predictions["majority"]["participant"].extend(row["participant_id"] for row in test)

        train_time_scores = [row["overrun_ratio"] for row in train]
        time_threshold = best_f1_threshold(train_y, train_time_scores)
        test_time_scores = [row["overrun_ratio"] for row in test]
        predictions["time_threshold"]["y"].extend(test_y)
        predictions["time_threshold"]["score"].extend(test_time_scores)
        predictions["time_threshold"]["predicted"].extend(
            int(score >= time_threshold) for score in test_time_scores
        )
        predictions["time_threshold"]["participant"].extend(row["participant_id"] for row in test)

        domain_counts: dict[str, list[int]] = collections.defaultdict(lambda: [0, 0])
        for row in train:
            domain_counts[row["domain"]][0] += row["drift_label"]
            domain_counts[row["domain"]][1] += 1
        smoothing = 12

        def domain_score(row: dict) -> float:
            positives, total = domain_counts[row["domain"]]
            return (positives + smoothing * prior) / (total + smoothing)

        train_domain_scores = [domain_score(row) for row in train]
        domain_threshold = best_f1_threshold(train_y, train_domain_scores)
        test_domain_scores = [domain_score(row) for row in test]
        predictions["domain"]["y"].extend(test_y)
        predictions["domain"]["score"].extend(test_domain_scores)
        predictions["domain"]["predicted"].extend(
            int(score >= domain_threshold) for score in test_domain_scores
        )
        predictions["domain"]["participant"].extend(row["participant_id"] for row in test)

        for kind in ["intention", "activity", "combined"]:
            model = fit_logistic(train, kind, intentions)
            train_scores = predict_logistic(model, train, kind, intentions)
            threshold = best_f1_threshold(train_y, train_scores)
            test_scores = predict_logistic(model, test, kind, intentions)
            predictions[kind]["y"].extend(test_y)
            predictions[kind]["score"].extend(test_scores)
            predictions[kind]["predicted"].extend(int(score >= threshold) for score in test_scores)
            predictions[kind]["participant"].extend(row["participant_id"] for row in test)

    result = {}
    for name, values in predictions.items():
        result[name] = metric_values(values["y"], values["score"], values["predicted"])

    rng = random.Random(20260815)
    participant_ids = sorted(set(predictions["combined"]["participant"]))
    participant_indices = {
        participant_id: [
            index
            for index, value in enumerate(predictions["combined"]["participant"])
            if value == participant_id
        ]
        for participant_id in participant_ids
    }
    auc_samples = {name: [] for name in model_names}
    contrast_samples = {
        "combined_minus_intention": [],
        "combined_minus_activity": [],
        "combined_minus_domain": [],
        "combined_minus_time_threshold": [],
    }
    for _ in range(2000):
        indices = [
            index
            for participant_id in rng.choices(participant_ids, k=len(participant_ids))
            for index in participant_indices[participant_id]
        ]
        sample_auc = {}
        for name in model_names:
            y_true = [predictions[name]["y"][index] for index in indices]
            scores = [predictions[name]["score"][index] for index in indices]
            sample_auc[name] = roc_auc(y_true, scores)
            auc_samples[name].append(sample_auc[name])
        contrast_samples["combined_minus_intention"].append(
            sample_auc["combined"] - sample_auc["intention"]
        )
        contrast_samples["combined_minus_activity"].append(
            sample_auc["combined"] - sample_auc["activity"]
        )
        contrast_samples["combined_minus_domain"].append(
            sample_auc["combined"] - sample_auc["domain"]
        )
        contrast_samples["combined_minus_time_threshold"].append(
            sample_auc["combined"] - sample_auc["time_threshold"]
        )
    for name in model_names:
        result[name]["roc_auc_ci_95_participant_bootstrap"] = interval(auc_samples[name])
    result["roc_auc_contrasts"] = {
        name: {
            "difference": result["combined"]["roc_auc"]
            - result[name.removeprefix("combined_minus_")]["roc_auc"],
            "ci_95_participant_bootstrap": interval(samples),
        }
        for name, samples in contrast_samples.items()
    }
    result["method"] = {
        "folds": len(folds),
        "participants_per_fold": [len(fold) for fold in folds],
        "sessions_per_fold": [
            sum(row["participant_id"] in fold for row in rows) for fold in folds
        ],
        "thresholding": "Threshold selected within each training fold to maximize F1, then applied to held-out participants.",
        "scope": "Exploratory full-session evaluation; not a preregistered or final model result.",
    }
    return result


def build_summary(rows: list[dict], file_checks: list[dict]) -> dict:
    participant_ids = sorted({row["participant_id"] for row in rows})
    by_participant = {
        participant_id: [row for row in rows if row["participant_id"] == participant_id]
        for participant_id in participant_ids
    }
    participant_rates = [rate(participant_rows) for participant_rows in by_participant.values()]
    participant_counts = [len(participant_rows) for participant_rows in by_participant.values()]

    duplicate_sessions = len(rows) - len({row["session_id"] for row in rows})
    exact_duplicate_rows = len(rows) - len(
        {
            tuple(row[column] for column in EXPECTED_COLUMNS)
            for row in rows
        }
    )
    overlap_count = 0
    for participant_rows in by_participant.values():
        previous_end = None
        for row in sorted(participant_rows, key=lambda item: item["start_time_dt"]):
            if previous_end is not None and row["start_time_dt"] < previous_end:
                overlap_count += 1
            previous_end = row["start_time_dt"] + timedelta(seconds=row["duration_seconds"])

    overall_bootstrap = participant_bootstrap(rows, rate)

    intention_rows = []
    for intention in sorted({row["declared_intention"] for row in rows}):
        subset = [row for row in rows if row["declared_intention"] == intention]
        bootstrap = participant_bootstrap(
            rows,
            lambda sample, intention=intention: rate(
                row for row in sample if row["declared_intention"] == intention
            ),
        )
        intention_rows.append(
            {
                "intention": intention,
                "label": INTENTION_LABELS[intention],
                "sessions": len(subset),
                "participant_coverage": len({row["participant_id"] for row in subset}),
                "drift_rate": rate(subset),
                "ci_95": interval(bootstrap),
                "median_duration_minutes": statistics.median(row["duration_seconds"] for row in subset) / 60,
            }
        )
    intention_rows.sort(key=lambda item: item["drift_rate"], reverse=True)

    open_ended_difference = participant_bootstrap(
        rows,
        lambda sample: rate(
            row for row in sample if row["declared_intention"] == "open_ended_browsing"
        )
        - rate(
            row
            for row in sample
            if row["declared_intention"]
            in {"work_or_study", "learning_or_tutorial", "specific_information"}
        ),
    )
    accidental_difference = participant_bootstrap(
        rows,
        lambda sample: rate(
            row for row in sample if row["declared_intention"] == "accidental_open"
        )
        - rate(row for row in sample if row["declared_intention"] != "accidental_open"),
    )

    overrun_definitions = [
        ("At or below intended time", lambda value: value <= 1),
        ("1.0-1.5x intended time", lambda value: 1 < value <= 1.5),
        ("1.5-2.0x intended time", lambda value: 1.5 < value <= 2),
        ("2.0-3.0x intended time", lambda value: 2 < value <= 3),
        ("More than 3x intended time", lambda value: value > 3),
    ]
    overrun_rows = []
    for label, predicate in overrun_definitions:
        subset = [row for row in rows if predicate(row["overrun_ratio"])]
        overrun_rows.append(
            {
                "band": label,
                "sessions": len(subset),
                "drift_rate": rate(subset),
            }
        )

    activity_rows = []
    for key, label, unit in [
        ("duration_seconds", "Session duration", "minutes"),
        ("idle_share", "Idle share of session", "share"),
        ("scroll_count_per_min", "Scroll events per minute", "events/min"),
        ("focus_loss_count_per_min", "Focus losses per minute", "events/min"),
        ("click_count_per_min", "Clicks per minute", "events/min"),
        ("keyboard_activity_count_per_min", "Keyboard activity per minute", "events/min"),
    ]:
        aligned = [row[key] for row in rows if row["drift_label"] == 0]
        drift = [row[key] for row in rows if row["drift_label"] == 1]
        aligned_value = statistics.median(aligned)
        drift_value = statistics.median(drift)
        if key == "duration_seconds":
            aligned_value /= 60
            drift_value /= 60
        activity_rows.append(
            {
                "signal": label,
                "unit": unit,
                "aligned_median": aligned_value,
                "drift_median": drift_value,
                "relative_difference": (drift_value - aligned_value) / aligned_value
                if aligned_value
                else None,
            }
        )

    domain_groups: dict[str, list[dict]] = collections.defaultdict(list)
    for row in rows:
        domain_groups[row["domain"]].append(row)
    domain_rows = [
        {"domain": domain, "sessions": len(subset), "drift_rate": rate(subset)}
        for domain, subset in domain_groups.items()
        if len(subset) >= 10
    ]
    domain_rows.sort(key=lambda item: item["drift_rate"], reverse=True)

    youtube_rows = []
    for intention in sorted({row["declared_intention"] for row in rows if row["domain"] == "youtube.com"}):
        subset = [
            row
            for row in rows
            if row["domain"] == "youtube.com" and row["declared_intention"] == intention
        ]
        youtube_rows.append(
            {
                "intention": INTENTION_LABELS[intention],
                "sessions": len(subset),
                "drift_rate": rate(subset),
            }
        )
    youtube_rows.sort(key=lambda item: item["drift_rate"], reverse=True)

    chronological_first: list[dict] = []
    chronological_second: list[dict] = []
    for participant_rows in by_participant.values():
        ordered = sorted(participant_rows, key=lambda item: item["start_time_dt"])
        midpoint = len(ordered) // 2
        chronological_first.extend(ordered[:midpoint])
        chronological_second.extend(ordered[midpoint:])
    chronological_bootstrap = participant_bootstrap(
        rows,
        lambda sample: (
            lambda grouped: (
                rate([row for participant in grouped.values() for row in participant[len(participant) // 2 :]])
                - rate([row for participant in grouped.values() for row in participant[: len(participant) // 2]])
            )
        )(
            {
                participant_id: sorted(
                    [row for row in sample if row["participant_id"] == participant_id],
                    key=lambda item: item["start_time_dt"],
                )
                for participant_id in {row["participant_id"] for row in sample}
            }
        ),
    )

    daily_rows = []
    for day in sorted({row["start_time_dt"].date() for row in rows}):
        subset = [row for row in rows if row["start_time_dt"].date() == day]
        daily_rows.append({"date": day.isoformat(), "sessions": len(subset), "drift_rate": rate(subset)})

    model_results = evaluate_models(rows)

    return {
        "source": {
            "path": "driftsense_data_final/participants/*.csv",
            "file_count": len(file_checks),
            "session_count": len(rows),
            "participant_count": len(participant_ids),
            "start": min(row["start_time_dt"] for row in rows).isoformat(),
            "end": max(row["start_time_dt"] for row in rows).isoformat(),
            "timezone": "UTC+06:00 (from source timestamps)",
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
        "data_quality": {
            "all_files_match_schema": all(check["schema_ok"] for check in file_checks),
            "missing_cells": sum(
                row[column] in {"", None} for row in rows for column in EXPECTED_COLUMNS
            ),
            "duplicate_session_ids": duplicate_sessions,
            "exact_duplicate_rows": exact_duplicate_rows,
            "filename_participant_mismatches": sum(
                row["_source_file"] != f'{row["participant_id"]}.csv' for row in rows
            ),
            "overlapping_sessions": overlap_count,
            "negative_numeric_values": sum(
                row[column] < 0 for row in rows for column in INTEGER_COLUMNS[:-1]
            ),
            "idle_exceeds_duration": sum(row["idle_seconds"] > row["duration_seconds"] for row in rows),
            "non_binary_labels": sum(row["drift_label"] not in {0, 1} for row in rows),
            "quarter_hour_start_share": sum(
                row["start_time_dt"].minute % 15 == 0 and row["start_time_dt"].second == 0
                for row in rows
            )
            / len(rows),
            "zero_second_start_share": sum(row["start_time_dt"].second == 0 for row in rows) / len(rows),
            "assessment": "Structurally clean, but the complete labels and highly rounded timestamps indicate synthetic or heavily curated data. Confirm provenance before treating this as field evidence.",
        },
        "outcome": {
            "drift_sessions": sum(row["drift_label"] for row in rows),
            "aligned_sessions": sum(1 - row["drift_label"] for row in rows),
            "drift_rate": rate(rows),
            "drift_rate_ci_95_participant_bootstrap": interval(overall_bootstrap),
            "participant_session_count": {
                "min": min(participant_counts),
                "median": statistics.median(participant_counts),
                "max": max(participant_counts),
            },
            "participant_drift_rate": {
                "min": min(participant_rates),
                "median": statistics.median(participant_rates),
                "max": max(participant_rates),
            },
        },
        "intentions": intention_rows,
        "intention_contrasts": {
            "open_ended_minus_task_directed": {
                "difference": rate(
                    row for row in rows if row["declared_intention"] == "open_ended_browsing"
                )
                - rate(
                    row
                    for row in rows
                    if row["declared_intention"]
                    in {"work_or_study", "learning_or_tutorial", "specific_information"}
                ),
                "ci_95_participant_bootstrap": interval(open_ended_difference),
                "definition": "Open-ended browsing minus work/study, learning/tutorial, and specific-information sessions.",
            },
            "accidental_minus_other": {
                "difference": rate(
                    row for row in rows if row["declared_intention"] == "accidental_open"
                )
                - rate(row for row in rows if row["declared_intention"] != "accidental_open"),
                "ci_95_participant_bootstrap": interval(accidental_difference),
            },
        },
        "overrun_bands": overrun_rows,
        "activity_medians": activity_rows,
        "domains_with_at_least_10_sessions": domain_rows,
        "youtube_by_intention": youtube_rows,
        "chronology": {
            "first_half_sessions": len(chronological_first),
            "first_half_drift_rate": rate(chronological_first),
            "second_half_sessions": len(chronological_second),
            "second_half_drift_rate": rate(chronological_second),
            "difference": rate(chronological_second) - rate(chronological_first),
            "difference_ci_95_participant_bootstrap": interval(chronological_bootstrap),
            "daily": daily_rows,
        },
        "exploratory_models": model_results,
        "unavailable": {
            "early_prediction_1_3_5_minutes": "Unavailable: the provided files contain only final session totals and no activity-window records.",
            "causal_claims": "Unsupported: this is observational session data with self-reported outcomes.",
        },
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path("driftsense_data_final/participants"))
    parser.add_argument("--output", type=Path, default=Path("driftsense_data_final/analysis/analysis_summary.json"))
    args = parser.parse_args()
    rows, file_checks = load_rows(args.input)
    summary = build_summary(rows, file_checks)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(f"Analyzed {len(rows)} sessions from {len(file_checks)} files")
    print(f"Wrote aggregate summary to {args.output}")


if __name__ == "__main__":
    main()
