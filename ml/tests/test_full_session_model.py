from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from ml.full_session_model import (
    build_pipeline,
    build_test_vectors,
    candidate_models,
    make_full_session_features,
    predict_from_artifact,
    serialize_pipeline,
)
from ml.model_development import SESSION_COLUMNS, load_sessions


def _row(index: int, participant: str, label: int) -> dict:
    duration = 600 + index * 20
    idle = 50 + index
    away = 20 + index
    active = duration - idle - away
    return {
        "session_id": f"s{index}",
        "participant_id": participant,
        "start_time": f"2026-01-{index + 1:02d}T10:00:00Z",
        "task_type": "coding_problem_solving",
        "intended_duration_minutes": 10,
        "initial_task_site": "example.com",
        "task_site_count": 2,
        "duration_seconds": duration,
        "click_count": 10 + index,
        "scroll_count": 20 + index,
        "keyboard_activity_count": 30 + index,
        "idle_seconds": idle,
        "active_seconds": active,
        "away_seconds": away,
        "tab_switch_count": 2 + index,
        "video_playing_seconds": 0,
        "post_session_answer": "moved_away" if label else "aligned",
        "drift_label": label,
    }


def test_full_session_feature_table_does_not_use_participant_id_as_feature(tmp_path: Path) -> None:
    path = tmp_path / "sessions.csv"
    pd.DataFrame(
        [_row(0, "p1", 0), _row(1, "p1", 1), _row(2, "p2", 0)],
        columns=SESSION_COLUMNS,
    ).to_csv(path, index=False)
    sessions, _ = load_sessions(path)
    features, relative = make_full_session_features(sessions)
    for candidate in candidate_models(relative):
        assert "participant_id" not in candidate.numeric
        assert "participant_id" not in candidate.categorical
    assert np.isfinite(features["log1p_duration_seconds"]).all()


def test_serialized_json_matches_sklearn_probability(tmp_path: Path) -> None:
    path = tmp_path / "sessions.csv"
    rows = []
    for participant_index in range(4):
        for session_index in range(6):
            index = participant_index * 6 + session_index
            rows.append(_row(index, f"p{participant_index}", (index + participant_index) % 2))
    pd.DataFrame(rows, columns=SESSION_COLUMNS).to_csv(path, index=False)
    sessions, quality = load_sessions(path)
    features, relative = make_full_session_features(sessions)
    candidate = next(item for item in candidate_models(relative) if item.name == "context_activity")
    pipeline = build_pipeline(candidate, 0.03)
    pipeline.fit(features, features["drift_label"].astype(int))
    artifact = serialize_pipeline(
        pipeline,
        candidate,
        0.03,
        0.4,
        quality["sha256"],
        len(features),
        {"roc_auc": 0.5},
    )
    vectors = build_test_vectors(features, pipeline, artifact, count=5)
    for vector in vectors:
        assert predict_from_artifact(artifact, vector["features"]) == pytest.approx(
            vector["expected_probability"], abs=1e-12
        )
