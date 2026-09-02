"""Leakage-aware Phase 1 model development for DriftSense.

The command accepts the session CSV exported by the extension and, when
available, the checkpoint and activity-window CSVs.  Final-session activity is
never used as an early (10/20/30/60/90 minute) feature. Without checkpoint data the
command still evaluates context-only early baselines and a clearly marked,
non-deployable full-session diagnostic model.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import joblib
import numpy as np
import pandas as pd
from sklearn.base import BaseEstimator
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    accuracy_score,
    brier_score_loss,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler


CHECKPOINTS = (600, 1200, 1800, 3600, 5400)
SESSION_COLUMNS = [
    "session_id",
    "participant_id",
    "start_time",
    "task_type",
    "intended_duration_minutes",
    "initial_task_site",
    "task_site_count",
    "duration_seconds",
    "click_count",
    "scroll_count",
    "keyboard_activity_count",
    "idle_seconds",
    "active_seconds",
    "away_seconds",
    "tab_switch_count",
    "video_playing_seconds",
    "post_session_answer",
    "drift_label",
]
CHECKPOINT_COLUMNS = [
    "sessionId",
    "anonymousUserId",
    "cutoffSeconds",
    "capturedAt",
    "observable",
    "clickCount",
    "scrollCount",
    "keyboardActivityCount",
    "idleSeconds",
    "activeSeconds",
    "awaySeconds",
    "tabSwitchCount",
    "videoPlayingSeconds",
]
WINDOW_COLUMNS = [
    "windowId",
    "sessionId",
    "anonymousUserId",
    "timestamp",
    "timestampOffsetSeconds",
    "windowDurationSeconds",
    "clicksInWindow",
    "scrollEventsInWindow",
    "keyboardActivityInWindow",
    "idleInWindow",
    "tabFocused",
    "videoPlaying",
    "taskSiteHostname",
]
TASK_TYPES = {
    "writing_creating",
    "coding_problem_solving",
    "reading_research",
    "learning_tutorial",
    "communication_coordination",
    "other_planned_task",
}

CONTEXT_NUMERIC = [
    "intended_duration_minutes",
    "elapsed_to_intended_ratio",
    "task_site_count",
]
CONTEXT_CATEGORICAL = ["task_type", "initial_task_site"]
ACTIVITY_FEATURES = [
    "click_rate_per_min",
    "scroll_rate_per_min",
    "keyboard_rate_per_min",
    "idle_share",
    "active_share",
    "away_share",
    "tab_switch_rate_per_min",
    "video_share",
]
RECENT_FEATURES = [
    "recent_click_rate_per_min",
    "recent_scroll_rate_per_min",
    "recent_keyboard_rate_per_min",
    "recent_idle_share",
    "recent_video_share",
    "recent_window_coverage_share",
]
PARTICIPANT_FEATURES = [
    "prior_labeled_session_count",
    "prior_drift_rate",
    "participant_baseline_available",
]


class DataValidationError(ValueError):
    """Raised when a source file cannot safely enter the model pipeline."""


@dataclass(frozen=True)
class ModelSpec:
    name: str
    numeric: tuple[str, ...] = ()
    categorical: tuple[str, ...] = ()
    kind: str = "logistic"
    uses_participant_features: bool = False


def _json_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    if isinstance(value, (np.integer,)):
        return int(value)
    if isinstance(value, (np.floating,)):
        return None if np.isnan(value) else float(value)
    if isinstance(value, (np.bool_,)):
        return bool(value)
    if pd.isna(value):
        return None
    return value


def _write_json(path: Path, payload: dict[str, Any]) -> None:
    path.write_text(json.dumps(_json_value(payload), indent=2), encoding="utf-8")


def _require_exact_schema(frame: pd.DataFrame, expected: list[str], source: Path) -> None:
    actual = list(frame.columns)
    if actual != expected:
        missing = [name for name in expected if name not in actual]
        extra = [name for name in actual if name not in expected]
        raise DataValidationError(
            f"{source} does not match the required schema; missing={missing}, extra={extra}, "
            f"column_order_matches={set(actual) == set(expected)}"
        )


def _parse_boolean(series: pd.Series, field: str) -> pd.Series:
    mapping = {
        True: True,
        False: False,
        1: True,
        0: False,
        "true": True,
        "false": False,
        "True": True,
        "False": False,
        "1": True,
        "0": False,
    }
    parsed = series.map(mapping)
    if parsed.isna().any():
        raise DataValidationError(f"{field} contains values that are not boolean")
    return parsed.astype(bool)


def load_sessions(path: Path, repair_labels_from_explicit_answer: bool = False) -> tuple[pd.DataFrame, dict[str, Any]]:
    frame = pd.read_csv(path)
    _require_exact_schema(frame, SESSION_COLUMNS, path)

    if frame.empty:
        raise DataValidationError("The session file is empty")
    if frame["session_id"].isna().any() or frame["session_id"].duplicated().any():
        raise DataValidationError("session_id must be present and unique")
    if frame["participant_id"].isna().any():
        raise DataValidationError("participant_id must be present")

    frame["start_time"] = pd.to_datetime(frame["start_time"], utc=True, errors="coerce")
    if frame["start_time"].isna().any():
        raise DataValidationError("start_time contains invalid timestamps")

    numeric_columns = [
        "intended_duration_minutes",
        "task_site_count",
        "duration_seconds",
        "click_count",
        "scroll_count",
        "keyboard_activity_count",
        "idle_seconds",
        "active_seconds",
        "away_seconds",
        "tab_switch_count",
        "video_playing_seconds",
    ]
    for column in numeric_columns:
        frame[column] = pd.to_numeric(frame[column], errors="coerce")
    if frame[numeric_columns].isna().any().any():
        bad = frame[numeric_columns].isna().sum()
        raise DataValidationError(f"Numeric parsing failed: {bad[bad > 0].to_dict()}")
    if (frame[numeric_columns] < 0).any().any():
        raise DataValidationError("Counts and durations must be non-negative")
    if (frame["intended_duration_minutes"] <= 0).any():
        raise DataValidationError("intended_duration_minutes must be positive")
    if (frame["task_site_count"] < 1).any():
        raise DataValidationError("task_site_count must be at least one")
    if not set(frame["task_type"].dropna()).issubset(TASK_TYPES):
        invalid = sorted(set(frame["task_type"].dropna()) - TASK_TYPES)
        raise DataValidationError(f"Unexpected task_type values: {invalid}")

    label = pd.to_numeric(frame["drift_label"], errors="coerce")
    if not set(label.dropna().unique()).issubset({0, 1}):
        raise DataValidationError("drift_label contains a non-binary value")
    expected_label = frame["post_session_answer"].map({"aligned": 0.0, "moved_away": 1.0})
    inconsistent = label.notna() & (label != expected_label)
    repaired_label_count = int(inconsistent.sum())
    if inconsistent.any():
        if not repair_labels_from_explicit_answer:
            raise DataValidationError(
                f"{repaired_label_count} rows disagree between post_session_answer and drift_label"
            )
        label.loc[inconsistent] = expected_label.loc[inconsistent]
    invalid_unlabeled = label.isna() & frame["post_session_answer"].isin(["aligned", "moved_away"])
    if invalid_unlabeled.any():
        raise DataValidationError(
            f"{int(invalid_unlabeled.sum())} explicit answers are missing their binary label"
        )
    frame["drift_label"] = label

    for field in ["idle_seconds", "active_seconds", "away_seconds", "video_playing_seconds"]:
        if (frame[field] > frame["duration_seconds"]).any():
            raise DataValidationError(f"{field} cannot exceed duration_seconds")

    ordered = frame.sort_values(["participant_id", "start_time"]).copy()
    ordered["end_time"] = ordered["start_time"] + pd.to_timedelta(
        ordered["duration_seconds"], unit="s"
    )
    previous_end = ordered.groupby("participant_id")["end_time"].shift()
    overlap_count = int((ordered["start_time"] < previous_end).sum())
    if overlap_count:
        raise DataValidationError(f"Found {overlap_count} overlapping participant sessions")

    time_delta = frame["duration_seconds"] - (
        frame["idle_seconds"] + frame["active_seconds"] + frame["away_seconds"]
    )
    labeled = frame[frame["drift_label"].isin([0, 1])]
    quality = {
        "source": str(path.resolve()),
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "rows": len(frame),
        "columns": len(frame.columns),
        "participants": int(frame["participant_id"].nunique()),
        "usable_binary_labels": len(labeled),
        "excluded_uncertain_or_missing_labels": int(frame["drift_label"].isna().sum()),
        "label_counts": {
            "aligned_0": int((frame["drift_label"] == 0).sum()),
            "moved_away_1": int((frame["drift_label"] == 1).sum()),
        },
        "drift_prevalence": float(labeled["drift_label"].mean()),
        "duplicate_session_ids": int(frame["session_id"].duplicated().sum()),
        "overlapping_sessions": overlap_count,
        "time_accounting_exact_rows": int((time_delta == 0).sum()),
        "time_accounting_max_abs_delta_seconds": float(time_delta.abs().max()),
        "date_min": frame["start_time"].min().isoformat(),
        "date_max": frame["start_time"].max().isoformat(),
        "sessions_per_participant": {
            key: float(value)
            for key, value in frame.groupby("participant_id").size().describe().to_dict().items()
        },
        "cutoff_coverage_binary_labeled": {
            str(cutoff): int((labeled["duration_seconds"] >= cutoff).sum())
            for cutoff in CHECKPOINTS
        },
        "warnings": ([f"Repaired {repaired_label_count} drift labels from explicit post-session answers in memory."] if repaired_label_count else []),
    }
    return frame.drop(columns=["end_time"], errors="ignore"), quality


def load_checkpoints(path: Path, sessions: pd.DataFrame) -> pd.DataFrame:
    frame = pd.read_csv(path)
    _require_exact_schema(frame, CHECKPOINT_COLUMNS, path)
    if frame.duplicated(["sessionId", "cutoffSeconds"]).any():
        raise DataValidationError("Checkpoint rows must be unique by sessionId and cutoffSeconds")
    frame["cutoffSeconds"] = pd.to_numeric(frame["cutoffSeconds"], errors="coerce")
    if not set(frame["cutoffSeconds"].dropna().astype(int)).issubset(set(CHECKPOINTS)):
        raise DataValidationError("Checkpoint offsets must be 600, 1200, 1800, 3600, or 5400 seconds")
    frame["observable"] = _parse_boolean(frame["observable"], "observable")
    numeric = [
        "clickCount",
        "scrollCount",
        "keyboardActivityCount",
        "idleSeconds",
        "activeSeconds",
        "awaySeconds",
        "tabSwitchCount",
        "videoPlayingSeconds",
    ]
    frame[numeric] = frame[numeric].apply(pd.to_numeric, errors="coerce")
    if frame[numeric].isna().any().any() or (frame[numeric] < 0).any().any():
        raise DataValidationError("Checkpoint measures must be present and non-negative")
    valid_sessions = set(sessions["session_id"])
    orphans = ~frame["sessionId"].isin(valid_sessions)
    if orphans.any():
        raise DataValidationError(f"Found {int(orphans.sum())} checkpoint rows without a session")
    owner = sessions.set_index("session_id")["participant_id"]
    mismatch = frame["anonymousUserId"] != frame["sessionId"].map(owner)
    if mismatch.any():
        raise DataValidationError(f"Found {int(mismatch.sum())} checkpoint participant mismatches")
    for field in ["idleSeconds", "activeSeconds", "awaySeconds", "videoPlayingSeconds"]:
        if (frame[field] > frame["cutoffSeconds"]).any():
            raise DataValidationError(f"Checkpoint {field} cannot exceed cutoffSeconds")
    return frame


def load_windows(path: Path, sessions: pd.DataFrame) -> pd.DataFrame:
    frame = pd.read_csv(path)
    _require_exact_schema(frame, WINDOW_COLUMNS, path)
    if frame["windowId"].isna().any() or frame["windowId"].duplicated().any():
        raise DataValidationError("windowId must be present and unique")
    owner = sessions.set_index("session_id")["participant_id"]
    if (~frame["sessionId"].isin(owner.index)).any():
        raise DataValidationError("Activity-window file contains orphan session IDs")
    if (frame["anonymousUserId"] != frame["sessionId"].map(owner)).any():
        raise DataValidationError("Activity-window participant does not match its session")
    numeric = [
        "timestampOffsetSeconds",
        "windowDurationSeconds",
        "clicksInWindow",
        "scrollEventsInWindow",
        "keyboardActivityInWindow",
    ]
    frame[numeric] = frame[numeric].apply(pd.to_numeric, errors="coerce")
    if frame[numeric].isna().any().any() or (frame[numeric] < 0).any().any():
        raise DataValidationError("Activity-window measures must be present and non-negative")
    if (frame["windowDurationSeconds"] <= 0).any():
        raise DataValidationError("windowDurationSeconds must be positive")
    for field in ["idleInWindow", "tabFocused", "videoPlaying"]:
        frame[field] = _parse_boolean(frame[field], field)
    return frame


def _base_session_features(sessions: pd.DataFrame) -> pd.DataFrame:
    frame = sessions.sort_values(["participant_id", "start_time", "session_id"]).copy()
    first_day = frame.groupby("participant_id")["start_time"].transform("min").dt.normalize()
    frame["day_index"] = (frame["start_time"].dt.normalize() - first_day).dt.days + 1
    frame["prior_labeled_session_count"] = frame.groupby("participant_id")[
        "drift_label"
    ].transform(lambda values: values.notna().shift(fill_value=False).cumsum())
    prior_sum = frame.groupby("participant_id")["drift_label"].transform(
        lambda values: values.fillna(0).shift(fill_value=0).cumsum()
    )
    frame["prior_drift_rate"] = prior_sum / frame["prior_labeled_session_count"].replace(0, np.nan)
    return frame


def _add_activity_rates(frame: pd.DataFrame, elapsed_seconds: pd.Series) -> pd.DataFrame:
    result = frame.copy()
    elapsed_minutes = elapsed_seconds / 60.0
    result["click_rate_per_min"] = result["click_count"] / elapsed_minutes
    result["scroll_rate_per_min"] = result["scroll_count"] / elapsed_minutes
    result["keyboard_rate_per_min"] = result["keyboard_activity_count"] / elapsed_minutes
    result["idle_share"] = result["idle_seconds"] / elapsed_seconds
    result["active_share"] = result["active_seconds"] / elapsed_seconds
    result["away_share"] = result["away_seconds"] / elapsed_seconds
    result["tab_switch_rate_per_min"] = result["tab_switch_count"] / elapsed_minutes
    result["video_share"] = result["video_playing_seconds"] / elapsed_seconds
    return result


def _add_participant_relative_features(frame: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    result = frame.sort_values(
        ["participant_id", "cutoff_seconds", "start_time", "session_id"]
    ).copy()
    group_keys = ["participant_id", "cutoff_seconds", "task_type"]
    relative: list[str] = []
    baseline_counts = (result["drift_label"] == 0).groupby(
        [result[key] for key in group_keys]
    ).transform(lambda values: values.shift(fill_value=False).cumsum())
    result["participant_baseline_available"] = (baseline_counts > 0).astype(float)
    for feature in [name for name in ACTIVITY_FEATURES + RECENT_FEATURES if name in result]:
        aligned_value = result[feature].where(result["drift_label"] == 0)
        prior_mean = aligned_value.groupby(
            [result[key] for key in group_keys]
        ).transform(lambda values: values.shift().expanding(min_periods=1).mean())
        relative_name = f"relative_{feature}"
        result[relative_name] = result[feature] - prior_mean
        relative.append(relative_name)
    return result.sort_index(), relative


def _add_recent_window_features(
    checkpoint_rows: pd.DataFrame, windows: pd.DataFrame, recent_seconds: int = 60
) -> pd.DataFrame:
    rows: list[dict[str, float | str | int]] = []
    windows_by_session = {key: value for key, value in windows.groupby("sessionId")}
    for snapshot in checkpoint_rows[["session_id", "cutoff_seconds"]].itertuples(index=False):
        current = windows_by_session.get(snapshot.session_id)
        if current is None:
            selected = windows.iloc[0:0]
        else:
            selected = current[
                (current["timestampOffsetSeconds"] <= snapshot.cutoff_seconds)
                & (current["timestampOffsetSeconds"] > snapshot.cutoff_seconds - recent_seconds)
            ]
        observed = float(selected["windowDurationSeconds"].sum())
        denominator = observed if observed > 0 else np.nan
        rows.append(
            {
                "session_id": snapshot.session_id,
                "cutoff_seconds": snapshot.cutoff_seconds,
                "recent_click_rate_per_min": float(selected["clicksInWindow"].sum())
                / (recent_seconds / 60),
                "recent_scroll_rate_per_min": float(selected["scrollEventsInWindow"].sum())
                / (recent_seconds / 60),
                "recent_keyboard_rate_per_min": float(
                    selected["keyboardActivityInWindow"].sum()
                )
                / (recent_seconds / 60),
                "recent_idle_share": float(
                    selected.loc[selected["idleInWindow"], "windowDurationSeconds"].sum()
                )
                / denominator,
                "recent_video_share": float(
                    selected.loc[selected["videoPlaying"], "windowDurationSeconds"].sum()
                )
                / denominator,
                "recent_window_coverage_share": min(observed / recent_seconds, 1.0),
            }
        )
    return checkpoint_rows.merge(pd.DataFrame(rows), on=["session_id", "cutoff_seconds"])


def make_early_feature_table(
    sessions: pd.DataFrame,
    checkpoints: pd.DataFrame | None = None,
    windows: pd.DataFrame | None = None,
) -> tuple[pd.DataFrame, list[str], str]:
    base = _base_session_features(sessions)
    session_fields = [
        "session_id",
        "participant_id",
        "start_time",
        "day_index",
        "task_type",
        "initial_task_site",
        "task_site_count",
        "intended_duration_minutes",
        "duration_seconds",
        "drift_label",
        "prior_labeled_session_count",
        "prior_drift_rate",
    ]
    if checkpoints is None:
        parts = []
        for cutoff in CHECKPOINTS:
            eligible = base[base["duration_seconds"] >= cutoff][session_fields].copy()
            eligible["cutoff_seconds"] = cutoff
            eligible["elapsed_to_intended_ratio"] = cutoff / (
                eligible["intended_duration_minutes"] * 60
            )
            parts.append(eligible)
        frame = pd.concat(parts, ignore_index=True)
        frame["participant_baseline_available"] = 0.0
        return frame, [], "context_only_duration_eligibility"

    rename = {
        "sessionId": "session_id",
        "cutoffSeconds": "cutoff_seconds",
        "clickCount": "click_count",
        "scrollCount": "scroll_count",
        "keyboardActivityCount": "keyboard_activity_count",
        "idleSeconds": "idle_seconds",
        "activeSeconds": "active_seconds",
        "awaySeconds": "away_seconds",
        "tabSwitchCount": "tab_switch_count",
        "videoPlayingSeconds": "video_playing_seconds",
    }
    observed = checkpoints[checkpoints["observable"]].rename(columns=rename)
    measure_fields = list(rename.values())[2:]
    frame = observed[["session_id", "cutoff_seconds", *measure_fields]].merge(
        base[session_fields], on="session_id", how="inner", validate="many_to_one"
    )
    frame["elapsed_to_intended_ratio"] = frame["cutoff_seconds"] / (
        frame["intended_duration_minutes"] * 60
    )
    frame = _add_activity_rates(frame, frame["cutoff_seconds"])
    if windows is not None:
        frame = _add_recent_window_features(frame, windows)
    frame, relative = _add_participant_relative_features(frame)
    return frame, relative, "checkpoint_activity"


def make_full_session_diagnostic_table(sessions: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    frame = _base_session_features(sessions)
    frame["cutoff_seconds"] = -1
    frame["elapsed_to_intended_ratio"] = frame["duration_seconds"] / (
        frame["intended_duration_minutes"] * 60
    )
    frame = _add_activity_rates(frame, frame["duration_seconds"].replace(0, np.nan))
    frame, relative = _add_participant_relative_features(frame)
    return frame, relative


def model_specs(
    has_activity: bool,
    relative_features: Iterable[str] = (),
    include_random_forest: bool = False,
) -> list[ModelSpec]:
    specs = [
        ModelSpec("majority_class", kind="majority"),
        ModelSpec("fixed_timer_prompt_all", kind="timer"),
        ModelSpec(
            "intended_duration",
            numeric=("intended_duration_minutes", "elapsed_to_intended_ratio"),
        ),
        ModelSpec("task_site_domain", categorical=("initial_task_site",)),
        ModelSpec("task_type", categorical=("task_type",)),
    ]
    if not has_activity:
        return specs
    activity = tuple(ACTIVITY_FEATURES + [name for name in RECENT_FEATURES if name])
    specs.extend(
        [
            ModelSpec("activity_only", numeric=activity),
            ModelSpec(
                "task_type_activity",
                numeric=tuple(CONTEXT_NUMERIC) + activity,
                categorical=("task_type",),
            ),
            ModelSpec(
                "task_context_activity",
                numeric=tuple(CONTEXT_NUMERIC) + activity,
                categorical=tuple(CONTEXT_CATEGORICAL),
            ),
        ]
    )
    relative = tuple(relative_features)
    if relative:
        specs.append(
            ModelSpec(
                "task_context_activity_participant_relative",
                numeric=tuple(CONTEXT_NUMERIC)
                + activity
                + tuple(PARTICIPANT_FEATURES)
                + relative,
                categorical=tuple(CONTEXT_CATEGORICAL),
                uses_participant_features=True,
            )
        )
    if include_random_forest:
        specs.append(
            ModelSpec(
                "random_forest_context_activity",
                numeric=tuple(CONTEXT_NUMERIC) + activity,
                categorical=tuple(CONTEXT_CATEGORICAL),
                kind="random_forest",
            )
        )
    return specs


def _available_spec(spec: ModelSpec, frame: pd.DataFrame) -> ModelSpec:
    return ModelSpec(
        name=spec.name,
        numeric=tuple(name for name in spec.numeric if name in frame.columns),
        categorical=tuple(name for name in spec.categorical if name in frame.columns),
        kind=spec.kind,
        uses_participant_features=spec.uses_participant_features,
    )


def build_estimator(spec: ModelSpec, random_state: int = 2026) -> Pipeline:
    transformers: list[tuple[str, Pipeline, list[str]]] = []
    if spec.numeric:
        transformers.append(
            (
                "numeric",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                list(spec.numeric),
            )
        )
    if spec.categorical:
        transformers.append(
            (
                "categorical",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="most_frequent")),
                        (
                            "encoder",
                            OneHotEncoder(handle_unknown="ignore", sparse_output=False),
                        ),
                    ]
                ),
                list(spec.categorical),
            )
        )
    preprocess = ColumnTransformer(transformers, remainder="drop", verbose_feature_names_out=False)
    if spec.kind == "random_forest":
        classifier: BaseEstimator = RandomForestClassifier(
            n_estimators=400,
            min_samples_leaf=5,
            class_weight="balanced_subsample",
            random_state=random_state,
            n_jobs=-1,
        )
    else:
        classifier = LogisticRegression(max_iter=2000, random_state=random_state)
    return Pipeline([("preprocess", preprocess), ("classifier", classifier)])


def classification_metrics(y_true: np.ndarray, probability: np.ndarray, threshold: float = 0.5) -> dict[str, Any]:
    prediction = (probability >= threshold).astype(int)
    tn, fp, fn, tp = confusion_matrix(y_true, prediction, labels=[0, 1]).ravel()
    auc = roc_auc_score(y_true, probability) if len(np.unique(y_true)) == 2 else np.nan
    return {
        "n": int(len(y_true)),
        "prevalence": float(np.mean(y_true)),
        "accuracy": float(accuracy_score(y_true, prediction)),
        "precision": float(precision_score(y_true, prediction, zero_division=0)),
        "recall": float(recall_score(y_true, prediction, zero_division=0)),
        "f1": float(f1_score(y_true, prediction, zero_division=0)),
        "roc_auc": float(auc),
        "brier": float(brier_score_loss(y_true, probability)),
        "prompt_rate": float(np.mean(prediction)),
        "false_prompt_rate_all_sessions": float(fp / len(y_true)),
        "false_prompt_share_of_prompts": float(fp / (tp + fp)) if (tp + fp) else 0.0,
        "threshold": float(threshold),
        "tn": int(tn),
        "fp": int(fp),
        "fn": int(fn),
        "tp": int(tp),
    }


def _baseline_probability(kind: str, y_train: np.ndarray, count: int) -> np.ndarray:
    prevalence = float(np.mean(y_train))
    if kind == "timer":
        return np.ones(count, dtype=float)
    return np.full(count, prevalence, dtype=float)


def grouped_oof_predictions(
    frame: pd.DataFrame,
    spec: ModelSpec,
    random_state: int = 2026,
    unseen_user_mode: bool = False,
) -> pd.DataFrame:
    eligible = frame[frame["drift_label"].isin([0, 1])].copy()
    y = eligible["drift_label"].astype(int).to_numpy()
    groups = eligible["participant_id"].astype(str).to_numpy()
    n_groups = len(np.unique(groups))
    n_splits = min(5, n_groups, int(np.bincount(y).min()))
    if n_splits < 2:
        raise DataValidationError("At least two participant groups and both labels are required")
    splitter = StratifiedGroupKFold(n_splits=n_splits, shuffle=True, random_state=random_state)
    probability = np.full(len(eligible), np.nan)
    fold_number = np.full(len(eligible), -1)
    for fold, (train_index, validation_index) in enumerate(
        splitter.split(eligible, y, groups), start=1
    ):
        y_train = y[train_index]
        if spec.kind in {"majority", "timer"}:
            probability[validation_index] = _baseline_probability(
                spec.kind, y_train, len(validation_index)
            )
        else:
            estimator = build_estimator(spec, random_state + fold)
            validation = eligible.iloc[validation_index].copy()
            if unseen_user_mode and spec.uses_participant_features:
                participant_columns = [
                    name
                    for name in (*PARTICIPANT_FEATURES, *spec.numeric)
                    if name.startswith("relative_") or name in PARTICIPANT_FEATURES
                ]
                for column in dict.fromkeys(participant_columns):
                    validation[column] = validation[column].astype(float)
                    validation[column] = np.nan
                if "participant_baseline_available" in validation:
                    validation["participant_baseline_available"] = 0.0
            estimator.fit(eligible.iloc[train_index], y_train)
            probability[validation_index] = estimator.predict_proba(validation)[:, 1]
        fold_number[validation_index] = fold
    if np.isnan(probability).any():
        raise RuntimeError("OOF prediction generation left missing rows")
    return pd.DataFrame(
        {
            "session_id": eligible["session_id"].to_numpy(),
            "participant_id": groups,
            "label": y,
            "probability": probability,
            "fold": fold_number,
        }
    )


def holdout_predictions(
    development: pd.DataFrame,
    holdout: pd.DataFrame,
    spec: ModelSpec,
    random_state: int = 2026,
) -> tuple[pd.DataFrame, Pipeline | None]:
    y_train = development["drift_label"].astype(int).to_numpy()
    y_holdout = holdout["drift_label"].astype(int).to_numpy()
    estimator: Pipeline | None = None
    if spec.kind in {"majority", "timer"}:
        probability = _baseline_probability(spec.kind, y_train, len(holdout))
    else:
        estimator = build_estimator(spec, random_state)
        estimator.fit(development, y_train)
        probability = estimator.predict_proba(holdout)[:, 1]
    result = pd.DataFrame(
        {
            "session_id": holdout["session_id"].to_numpy(),
            "participant_id": holdout["participant_id"].astype(str).to_numpy(),
            "label": y_holdout,
            "probability": probability,
        }
    )
    return result, estimator


def choose_threshold(y_true: np.ndarray, probability: np.ndarray, max_prompt_rate: float) -> dict[str, float]:
    candidates = np.unique(np.concatenate(([0.0, 1.0], probability)))
    scored = []
    for threshold in candidates:
        metrics = classification_metrics(y_true, probability, float(threshold))
        if metrics["prompt_rate"] <= max_prompt_rate + 1e-12:
            scored.append(metrics)
    if not scored:
        scored = [classification_metrics(y_true, probability, 1.0)]
    best = max(scored, key=lambda item: (item["f1"], item["recall"], -item["prompt_rate"]))
    return {
        "threshold": best["threshold"],
        "development_f1": best["f1"],
        "development_recall": best["recall"],
        "development_prompt_rate": best["prompt_rate"],
        "max_prompt_rate": max_prompt_rate,
    }


def participant_bootstrap_ci(
    predictions: pd.DataFrame,
    threshold: float,
    repetitions: int = 1000,
    random_state: int = 2026,
) -> dict[str, list[float] | int]:
    participants = predictions["participant_id"].unique()
    rng = np.random.default_rng(random_state)
    values: dict[str, list[float]] = {name: [] for name in ["accuracy", "precision", "recall", "f1", "roc_auc"]}
    for _ in range(repetitions):
        sampled = rng.choice(participants, size=len(participants), replace=True)
        pieces = [predictions[predictions["participant_id"] == participant] for participant in sampled]
        boot = pd.concat(pieces, ignore_index=True)
        metrics = classification_metrics(
            boot["label"].to_numpy(), boot["probability"].to_numpy(), threshold
        )
        for name in values:
            if not np.isnan(metrics[name]):
                values[name].append(metrics[name])
    return {
        "repetitions": repetitions,
        **{
            name: [float(np.quantile(result, 0.025)), float(np.quantile(result, 0.975))]
            for name, result in values.items()
            if result
        },
    }


def _serialize_logistic_model(
    estimator: Pipeline,
    spec: ModelSpec,
    threshold: float,
    checkpoint: int,
    training_rows: int,
    source_hash: str,
) -> dict[str, Any]:
    preprocess: ColumnTransformer = estimator.named_steps["preprocess"]
    classifier: LogisticRegression = estimator.named_steps["classifier"]
    numeric_preprocessing: dict[str, Any] = {}
    categorical_encoding: dict[str, Any] = {}
    if spec.numeric:
        numeric_pipeline: Pipeline = preprocess.named_transformers_["numeric"]
        imputer: SimpleImputer = numeric_pipeline.named_steps["imputer"]
        scaler: StandardScaler = numeric_pipeline.named_steps["scaler"]
        for index, name in enumerate(spec.numeric):
            numeric_preprocessing[name] = {
                "impute_median": float(imputer.statistics_[index]),
                "mean": float(scaler.mean_[index]),
                "scale": float(scaler.scale_[index]),
            }
    if spec.categorical:
        categorical_pipeline: Pipeline = preprocess.named_transformers_["categorical"]
        imputer = categorical_pipeline.named_steps["imputer"]
        encoder: OneHotEncoder = categorical_pipeline.named_steps["encoder"]
        for index, name in enumerate(spec.categorical):
            categorical_encoding[name] = {
                "impute_value": str(imputer.statistics_[index]),
                "categories": [str(value) for value in encoder.categories_[index]],
                "unknown_policy": "all_zero",
            }
    return {
        "artifact_status": "frozen_phase2_candidate",
        "model_version": f"phase1-logistic-{checkpoint}s-v1",
        "checkpoint_policy": f"single_{checkpoint}_seconds",
        "prediction_offsets_seconds": [checkpoint],
        "selected_model": spec.name,
        "source_columns": {"numeric": list(spec.numeric), "categorical": list(spec.categorical)},
        "feature_order": [str(name) for name in preprocess.get_feature_names_out()],
        "numeric_preprocessing": numeric_preprocessing,
        "categorical_encoding": categorical_encoding,
        "participant_calibration": {
            "uses_prior_sessions_only": spec.uses_participant_features,
            "fallback": "training_median_and_baseline_available_0",
        },
        "coefficients": classifier.coef_[0].astype(float).tolist(),
        "intercept": float(classifier.intercept_[0]),
        "risk_threshold": float(threshold),
        "prompt_probability": 0.5,
        "daily_prompt_cap": 3,
        "training_rows": training_rows,
        "training_source_sha256": source_hash,
    }


def _comparison_row(
    cutoff: int | str,
    model: str,
    evaluation: str,
    cohort: str,
    metrics: dict[str, Any],
) -> dict[str, Any]:
    return {
        "cutoff_seconds": cutoff,
        "model": model,
        "evaluation": evaluation,
        "cohort": cohort,
        **metrics,
    }


def evaluate_feature_table(
    frame: pd.DataFrame,
    specs: list[ModelSpec],
    cutoff: int | str,
    development_days: int,
    common_session_ids: set[str] | None,
    random_state: int,
) -> tuple[list[dict[str, Any]], dict[str, pd.DataFrame], dict[str, ModelSpec]]:
    labeled = frame[frame["drift_label"].isin([0, 1])].copy()
    development = labeled[labeled["day_index"] <= development_days]
    holdout = labeled[labeled["day_index"] > development_days]
    if development.empty or holdout.empty:
        raise DataValidationError(
            f"Cutoff {cutoff} needs both day 1-{development_days} development rows and later holdout rows"
        )
    rows: list[dict[str, Any]] = []
    predictions: dict[str, pd.DataFrame] = {}
    available_specs: dict[str, ModelSpec] = {}
    for original_spec in specs:
        spec = _available_spec(original_spec, frame)
        available_specs[spec.name] = spec
        oof = grouped_oof_predictions(development, spec, random_state=random_state)
        predictions[f"{spec.name}:oof"] = oof
        rows.append(
            _comparison_row(
                cutoff,
                spec.name,
                "participant_grouped_development_oof",
                "cutoff_specific",
                classification_metrics(oof["label"].to_numpy(), oof["probability"].to_numpy()),
            )
        )
        if common_session_ids is not None:
            common_oof = oof[oof["session_id"].isin(common_session_ids)]
            if not common_oof.empty:
                rows.append(
                    _comparison_row(
                        cutoff,
                        spec.name,
                        "participant_grouped_development_oof",
                        "common_10_minute_subset",
                        classification_metrics(
                            common_oof["label"].to_numpy(), common_oof["probability"].to_numpy()
                        ),
                    )
                )
        if spec.uses_participant_features:
            unseen = grouped_oof_predictions(
                development, spec, random_state=random_state, unseen_user_mode=True
            )
            rows.append(
                _comparison_row(
                    cutoff,
                    spec.name,
                    "participant_held_out_unseen_user",
                    "cutoff_specific",
                    classification_metrics(
                        unseen["label"].to_numpy(), unseen["probability"].to_numpy()
                    ),
                )
            )
        holdout_prediction, _ = holdout_predictions(
            development, holdout, spec, random_state=random_state
        )
        predictions[f"{spec.name}:holdout"] = holdout_prediction
        rows.append(
            _comparison_row(
                cutoff,
                spec.name,
                "chronological_known_participant_holdout",
                "cutoff_specific",
                classification_metrics(
                    holdout_prediction["label"].to_numpy(),
                    holdout_prediction["probability"].to_numpy(),
                ),
            )
        )
    return rows, predictions, available_specs


def run_analysis(
    sessions_path: Path,
    output_directory: Path,
    checkpoints_path: Path | None = None,
    windows_path: Path | None = None,
    development_days: int = 7,
    max_prompt_rate: float = 0.35,
    include_random_forest: bool = False,
    random_state: int = 2026,
) -> dict[str, Any]:
    output_directory.mkdir(parents=True, exist_ok=True)
    sessions, quality = load_sessions(sessions_path)
    checkpoints = load_checkpoints(checkpoints_path, sessions) if checkpoints_path else None
    windows = load_windows(windows_path, sessions) if windows_path else None
    if windows is not None and checkpoints is None:
        raise DataValidationError("Activity windows require checkpoint rows for cutoff-safe modeling")

    early, early_relative, early_mode = make_early_feature_table(sessions, checkpoints, windows)
    quality["early_feature_mode"] = early_mode
    quality["checkpoint_rows"] = 0 if checkpoints is None else len(checkpoints)
    quality["activity_window_rows"] = 0 if windows is None else len(windows)
    if checkpoints is None:
        quality["warnings"].append(
            "No checkpoint CSV was supplied. Early activity models and model freezing are blocked; "
            "only context-known-at-start baselines are valid at the configured checkpoints."
        )
    if checkpoints is not None and windows is None:
        quality["warnings"].append(
            "No activity-window CSV was supplied. Cumulative checkpoint features are valid, but "
            "recent-window feature comparisons are unavailable."
        )

    comparison_rows: list[dict[str, Any]] = []
    prediction_store: dict[tuple[int | str, str], pd.DataFrame] = {}
    spec_store: dict[tuple[int | str, str], ModelSpec] = {}
    common_ids = set(
        early.loc[
            (early["cutoff_seconds"] == 600) & early["drift_label"].isin([0, 1]), "session_id"
        ]
    )
    for cutoff in CHECKPOINTS:
        cutoff_frame = early[early["cutoff_seconds"] == cutoff].copy()
        has_activity = checkpoints is not None
        specs = model_specs(has_activity, early_relative, include_random_forest)
        rows, predictions, available = evaluate_feature_table(
            cutoff_frame,
            specs,
            cutoff,
            development_days,
            common_ids,
            random_state,
        )
        comparison_rows.extend(rows)
        for key, value in predictions.items():
            prediction_store[(cutoff, key)] = value
        for key, value in available.items():
            spec_store[(cutoff, key)] = value

    full, full_relative = make_full_session_diagnostic_table(sessions)
    full_specs = model_specs(True, full_relative, include_random_forest)
    full_rows, full_predictions, full_available = evaluate_feature_table(
        full,
        full_specs,
        "full_session_diagnostic",
        development_days,
        None,
        random_state,
    )
    comparison_rows.extend(full_rows)
    for key, value in full_predictions.items():
        prediction_store[("full_session_diagnostic", key)] = value
    for key, value in full_available.items():
        spec_store[("full_session_diagnostic", key)] = value

    comparison = pd.DataFrame(comparison_rows)
    comparison.to_csv(output_directory / "model_comparison.csv", index=False)
    cutoff_summary_rows = []
    for cutoff in CHECKPOINTS:
        cutoff_rows = early[early["cutoff_seconds"] == cutoff]
        labeled_rows = cutoff_rows[cutoff_rows["drift_label"].isin([0, 1])]
        development_rows = labeled_rows[labeled_rows["day_index"] <= development_days]
        holdout_rows = labeled_rows[labeled_rows["day_index"] > development_days]
        cutoff_summary_rows.append(
            {
                "cutoff_seconds": cutoff,
                "feature_mode": early_mode,
                "observable_sessions": int(cutoff_rows["session_id"].nunique()),
                "usable_binary_labeled_sessions": len(labeled_rows),
                "aligned_0": int((labeled_rows["drift_label"] == 0).sum()),
                "moved_away_1": int((labeled_rows["drift_label"] == 1).sum()),
                "drift_prevalence": float(labeled_rows["drift_label"].mean()),
                "development_rows": len(development_rows),
                "chronological_holdout_rows": len(holdout_rows),
                "chronological_holdout_participants": int(
                    holdout_rows["participant_id"].nunique()
                ),
                "common_10_minute_subset_rows": int(
                    labeled_rows["session_id"].isin(common_ids).sum()
                ),
            }
        )
    pd.DataFrame(cutoff_summary_rows).to_csv(
        output_directory / "cutoff_summary.csv", index=False
    )
    _write_json(output_directory / "data_quality.json", quality)

    selection: dict[str, Any]
    if checkpoints is None:
        diagnostic_candidates = comparison[
            (comparison["cutoff_seconds"] == "full_session_diagnostic")
            & (comparison["evaluation"] == "participant_grouped_development_oof")
            & (comparison["cohort"] == "cutoff_specific")
            & comparison["model"].isin(
                [
                    "activity_only",
                    "task_type_activity",
                    "task_context_activity",
                    "task_context_activity_participant_relative",
                ]
            )
        ].dropna(subset=["roc_auc"])
        best = diagnostic_candidates.sort_values(["roc_auc", "brier"], ascending=[False, True]).iloc[0]
        model_name = str(best["model"])
        oof = prediction_store[("full_session_diagnostic", f"{model_name}:oof")]
        threshold_info = choose_threshold(
            oof["label"].to_numpy(), oof["probability"].to_numpy(), max_prompt_rate
        )
        holdout_prediction = prediction_store[
            ("full_session_diagnostic", f"{model_name}:holdout")
        ]
        holdout_metrics = classification_metrics(
            holdout_prediction["label"].to_numpy(),
            holdout_prediction["probability"].to_numpy(),
            threshold_info["threshold"],
        )
        spec = spec_store[("full_session_diagnostic", model_name)]
        development = full[
            full["drift_label"].isin([0, 1]) & (full["day_index"] <= development_days)
        ]
        diagnostic_estimator = build_estimator(spec, random_state)
        diagnostic_estimator.fit(development, development["drift_label"].astype(int))
        joblib.dump(diagnostic_estimator, output_directory / "diagnostic_full_session_model.joblib")
        selection = {
            "status": "blocked_for_phase2",
            "reason": "checkpoint_csv_missing",
            "deployable_early_model_created": False,
            "diagnostic_model": model_name,
            "diagnostic_scope": "Uses final-session totals and must not be deployed at a mid-session checkpoint.",
            "threshold_selection": threshold_info,
            "chronological_holdout": holdout_metrics,
            "chronological_holdout_participant_bootstrap_95_ci": participant_bootstrap_ci(
                holdout_prediction, threshold_info["threshold"], random_state=random_state
            ),
        }
    else:
        candidates = comparison[
            (comparison["evaluation"] == "participant_grouped_development_oof")
            & (comparison["cohort"] == "cutoff_specific")
            & comparison["cutoff_seconds"].isin(CHECKPOINTS)
            & comparison["model"].isin(
                [
                    "activity_only",
                    "task_type_activity",
                    "task_context_activity",
                    "task_context_activity_participant_relative",
                ]
            )
        ].dropna(subset=["roc_auc"])
        best_auc = float(candidates["roc_auc"].max())
        near_best = candidates[candidates["roc_auc"] >= best_auc - 0.01].copy()
        complexity = {
            "activity_only": 0,
            "task_type_activity": 1,
            "task_context_activity": 2,
            "task_context_activity_participant_relative": 3,
        }
        near_best["complexity"] = near_best["model"].map(complexity)
        selected = near_best.sort_values(["cutoff_seconds", "complexity"]).iloc[0]
        checkpoint = int(selected["cutoff_seconds"])
        model_name = str(selected["model"])
        oof = prediction_store[(checkpoint, f"{model_name}:oof")]
        threshold_info = choose_threshold(
            oof["label"].to_numpy(), oof["probability"].to_numpy(), max_prompt_rate
        )
        checkpoint_frame = early[
            (early["cutoff_seconds"] == checkpoint) & early["drift_label"].isin([0, 1])
        ]
        development = checkpoint_frame[checkpoint_frame["day_index"] <= development_days]
        holdout_prediction = prediction_store[(checkpoint, f"{model_name}:holdout")]
        holdout_metrics = classification_metrics(
            holdout_prediction["label"].to_numpy(),
            holdout_prediction["probability"].to_numpy(),
            threshold_info["threshold"],
        )
        spec = spec_store[(checkpoint, model_name)]
        final_estimator = build_estimator(spec, random_state)
        final_estimator.fit(checkpoint_frame, checkpoint_frame["drift_label"].astype(int))
        joblib.dump(final_estimator, output_directory / "frozen_model.joblib")
        artifact = _serialize_logistic_model(
            final_estimator,
            spec,
            threshold_info["threshold"],
            checkpoint,
            len(checkpoint_frame),
            quality["sha256"],
        )
        _write_json(output_directory / "frozen_model.json", artifact)
        selection = {
            "status": "frozen_phase2_candidate",
            "deployable_early_model_created": True,
            "checkpoint_seconds": checkpoint,
            "model": model_name,
            "selection_rule": (
                "Highest participant-grouped development ROC-AUC; within 0.01 choose the earliest "
                "checkpoint, then the simpler model."
            ),
            "threshold_selection": threshold_info,
            "chronological_holdout": holdout_metrics,
            "chronological_holdout_participant_bootstrap_95_ci": participant_bootstrap_ci(
                holdout_prediction, threshold_info["threshold"], random_state=random_state
            ),
        }

    summary = {
        "protocol": {
            "development_days": development_days,
            "chronological_holdout": f"participant-relative day_index > {development_days}",
            "grouped_folds": 5,
            "random_state": random_state,
            "max_prompt_rate": max_prompt_rate,
            "cutoffs_seconds": list(CHECKPOINTS),
        },
        "data_quality": quality,
        "selection": selection,
        "artifacts": {
            "model_comparison_csv": str((output_directory / "model_comparison.csv").resolve()),
            "cutoff_summary_csv": str((output_directory / "cutoff_summary.csv").resolve()),
            "data_quality_json": str((output_directory / "data_quality.json").resolve()),
        },
    }
    _write_json(output_directory / "analysis_summary.json", summary)
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sessions", type=Path, required=True, help="Phase 1 session CSV")
    parser.add_argument("--checkpoints", type=Path, help="Leakage-safe checkpoint CSV")
    parser.add_argument("--windows", type=Path, help="Optional activity-window CSV")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("ml/artifacts/phase1_model_development"),
        help="Directory for aggregate results and model artifacts",
    )
    parser.add_argument("--development-days", type=int, default=7)
    parser.add_argument("--max-prompt-rate", type=float, default=0.35)
    parser.add_argument("--include-random-forest", action="store_true")
    parser.add_argument("--random-state", type=int, default=2026)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.development_days < 1:
        raise SystemExit("--development-days must be positive")
    if not 0 < args.max_prompt_rate <= 1:
        raise SystemExit("--max-prompt-rate must be in (0, 1]")
    summary = run_analysis(
        sessions_path=args.sessions.resolve(),
        checkpoints_path=args.checkpoints.resolve() if args.checkpoints else None,
        windows_path=args.windows.resolve() if args.windows else None,
        output_directory=args.output.resolve(),
        development_days=args.development_days,
        max_prompt_rate=args.max_prompt_rate,
        include_random_forest=args.include_random_forest,
        random_state=args.random_state,
    )
    print(json.dumps(_json_value(summary["selection"]), indent=2))
    print(f"Artifacts: {args.output.resolve()}")


if __name__ == "__main__":
    main()
