"""Train the provisional rolling DriftSense activity-share model.

The training rows contain completed-session aggregates. The resulting model is
for the separate technical/usability pilot and must be prospectively validated
on true rolling snapshots before the formal randomized Phase 2 study.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from ml.model_development import (
    ModelSpec, _add_activity_rates, _base_session_features,
    _serialize_logistic_model, build_estimator, choose_threshold,
    classification_metrics, grouped_oof_predictions, holdout_predictions,
    load_sessions,
)


def train(source: Path, output: Path, bundled: Path) -> dict:
    sessions, quality = load_sessions(source, repair_labels_from_explicit_answer=True)
    frame = _base_session_features(sessions)
    frame["cutoff_seconds"] = frame["duration_seconds"]
    frame["elapsed_to_intended_ratio"] = frame["duration_seconds"] / (frame["intended_duration_minutes"] * 60)
    frame = _add_activity_rates(frame, frame["duration_seconds"])
    frame = frame[frame["drift_label"].isin([0, 1])].copy()
    spec = ModelSpec(
        "rolling_activity_context_pilot",
        numeric=("intended_duration_minutes", "elapsed_to_intended_ratio", "task_site_count", "active_share", "idle_share", "away_share"),
        categorical=("task_type",),
    )
    development = frame[frame["day_index"] <= 7]
    holdout = frame[frame["day_index"] > 7]
    oof = grouped_oof_predictions(development, spec)
    threshold = choose_threshold(oof["label"].to_numpy(), oof["probability"].to_numpy(), 0.35)["threshold"]
    holdout_predictions_frame, _ = holdout_predictions(development, holdout, spec)
    holdout_metrics = classification_metrics(holdout_predictions_frame["label"].to_numpy(), holdout_predictions_frame["probability"].to_numpy(), threshold)
    estimator = build_estimator(spec)
    estimator.fit(frame, frame["drift_label"].astype(int))
    artifact = _serialize_logistic_model(estimator, spec, threshold, 600, len(frame), quality["sha256"])
    observed_durations = sorted(int(value) for value in frame["intended_duration_minutes"].dropna().unique())
    artifact.update({
        "model_version": "phase1-rolling-activity-logistic-v1",
        "model_scope": "rolling_activity_technical_pilot",
        "prediction_policy": "duration_relative_windows_at_one_third_and_two_thirds",
        "prediction_offsets_seconds": [],
        "consecutive_positive_scores_required": 2,
        "observed_intended_durations_minutes": observed_durations,
        "intended_duration_range_minutes": [min(observed_durations), max(observed_durations)],
        "duration_feature_policy": "linear_interpolation_with_boundary_clipping",
        "activity_features_used": True,
        "chronological_holdout_metrics": holdout_metrics,
        "data_quality_warnings": quality["warnings"],
        "deployment_note": "Provisional pilot model trained on completed-session activity proportions. Prospectively validate rolling performance before formal Phase 2.",
    })
    encoded = json.dumps(artifact, indent=2)
    for path in (output, bundled):
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(encoded, encoding="utf-8")
    return artifact


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sessions", type=Path, default=Path("driftsense_merged.csv"))
    parser.add_argument("--output", type=Path, default=Path("ml/artifacts/rolling_activity_model/frozen_model.json"))
    parser.add_argument("--bundled", type=Path, default=Path("extension/public/models/frozen_model.json"))
    args = parser.parse_args()
    model = train(args.sessions, args.output, args.bundled)
    print(json.dumps({"model_version": model["model_version"], "training_rows": model["training_rows"], "risk_threshold": model["risk_threshold"], "holdout": model["chronological_holdout_metrics"]}, indent=2))
