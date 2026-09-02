"""Train a leakage-safe 10-minute intended-duration logistic baseline.

This is a deployable ML baseline for hardware integration. It uses no activity
totals; every predictive input is known at session start or fixed by the
10-minute checkpoint.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from ml.model_development import (
    ModelSpec,
    _base_session_features,
    _serialize_logistic_model,
    build_estimator,
    classification_metrics,
    choose_threshold,
    grouped_oof_predictions,
    holdout_predictions,
    load_sessions,
)


def train(source: Path, output: Path, bundled: Path) -> dict:
    sessions, quality = load_sessions(source, repair_labels_from_explicit_answer=True)
    cutoff = 600
    frame = _base_session_features(sessions)
    frame = frame[(frame["duration_seconds"] >= cutoff) & frame["drift_label"].isin([0, 1])].copy()
    frame["cutoff_seconds"] = cutoff
    frame["elapsed_to_intended_ratio"] = (cutoff / 60) / frame["intended_duration_minutes"]
    spec = ModelSpec("intended_duration", numeric=("intended_duration_minutes", "elapsed_to_intended_ratio"))
    development = frame[frame["day_index"] <= 7]
    oof = grouped_oof_predictions(development, spec)
    threshold = choose_threshold(oof["label"].to_numpy(), oof["probability"].to_numpy(), 0.35)["threshold"]
    holdout = frame[frame["day_index"] > 7]
    holdout_result, _ = holdout_predictions(development, holdout, spec)
    holdout_metrics = classification_metrics(holdout_result["label"].to_numpy(), holdout_result["probability"].to_numpy(), threshold)
    estimator = build_estimator(spec)
    estimator.fit(frame, frame["drift_label"].astype(int))
    artifact = _serialize_logistic_model(estimator, spec, threshold, cutoff, len(frame), quality["sha256"])
    artifact.update({
        "model_scope": "10_minute_intended_duration_baseline",
        "activity_features_used": False,
        "deployment_note": "ML integration baseline; does not infer attention or use live activity features.",
        "data_quality_warnings": quality["warnings"],
        "chronological_holdout_metrics": holdout_metrics,
    })
    output.parent.mkdir(parents=True, exist_ok=True)
    bundled.parent.mkdir(parents=True, exist_ok=True)
    encoded = json.dumps(artifact, indent=2)
    output.write_text(encoded, encoding="utf-8")
    bundled.write_text(encoded, encoding="utf-8")
    return artifact


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sessions", type=Path, default=Path("driftsense_merged.csv"))
    parser.add_argument("--output", type=Path, default=Path("ml/artifacts/intended_duration_baseline/frozen_model.json"))
    parser.add_argument("--bundled", type=Path, default=Path("extension/public/models/frozen_model.json"))
    args = parser.parse_args()
    model = train(args.sessions, args.output, args.bundled)
    print(json.dumps({"model_version": model["model_version"], "training_rows": model["training_rows"], "risk_threshold": model["risk_threshold"]}, indent=2))
