from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest

from ml.model_development import (
    CHECKPOINT_COLUMNS,
    DataValidationError,
    SESSION_COLUMNS,
    load_checkpoints,
    load_sessions,
    make_early_feature_table,
)


def session_row(session_id: str, participant: str, start: str, label: int | None) -> dict:
    answer = {0: "aligned", 1: "moved_away", None: "not_sure"}[label]
    return {
        "session_id": session_id,
        "participant_id": participant,
        "start_time": start,
        "task_type": "coding_problem_solving",
        "intended_duration_minutes": 10,
        "initial_task_site": "example.com",
        "task_site_count": 2,
        "duration_seconds": 700,
        "click_count": 10,
        "scroll_count": 20,
        "keyboard_activity_count": 30,
        "idle_seconds": 100,
        "active_seconds": 500,
        "away_seconds": 100,
        "tab_switch_count": 3,
        "video_playing_seconds": 0,
        "post_session_answer": answer,
        "drift_label": label,
    }


def write_sessions(path: Path, rows: list[dict]) -> None:
    pd.DataFrame(rows, columns=SESSION_COLUMNS).to_csv(path, index=False)


def test_session_validation_preserves_uncertain_rows_but_excludes_them_from_count(tmp_path: Path) -> None:
    path = tmp_path / "sessions.csv"
    write_sessions(
        path,
        [
            session_row("s1", "p1", "2026-01-01T10:00:00Z", 0),
            session_row("s2", "p1", "2026-01-01T12:00:00Z", None),
        ],
    )
    frame, quality = load_sessions(path)
    assert len(frame) == 2
    assert quality["usable_binary_labels"] == 1
    assert quality["excluded_uncertain_or_missing_labels"] == 1


def test_duplicate_session_id_is_rejected(tmp_path: Path) -> None:
    path = tmp_path / "sessions.csv"
    write_sessions(
        path,
        [
            session_row("same", "p1", "2026-01-01T10:00:00Z", 0),
            session_row("same", "p1", "2026-01-01T12:00:00Z", 1),
        ],
    )
    with pytest.raises(DataValidationError, match="session_id"):
        load_sessions(path)


def test_checkpoint_features_use_checkpoint_values_not_final_totals(tmp_path: Path) -> None:
    sessions_path = tmp_path / "sessions.csv"
    write_sessions(
        sessions_path,
        [session_row("s1", "p1", "2026-01-01T10:00:00Z", 1)],
    )
    sessions, _ = load_sessions(sessions_path)
    checkpoint_path = tmp_path / "checkpoints.csv"
    pd.DataFrame(
        [
            {
                "sessionId": "s1",
                "anonymousUserId": "p1",
                "cutoffSeconds": 600,
                "capturedAt": "2026-01-01T10:10:01Z",
                "observable": True,
                "clickCount": 2,
                "scrollCount": 3,
                "keyboardActivityCount": 4,
                "idleSeconds": 20,
                "activeSeconds": 560,
                "awaySeconds": 20,
                "tabSwitchCount": 1,
                "videoPlayingSeconds": 0,
            }
        ],
        columns=CHECKPOINT_COLUMNS,
    ).to_csv(checkpoint_path, index=False)
    checkpoints = load_checkpoints(checkpoint_path, sessions)
    features, _, mode = make_early_feature_table(sessions, checkpoints)
    assert mode == "checkpoint_activity"
    assert len(features) == 1
    assert features.iloc[0]["click_rate_per_min"] == pytest.approx(2 / 10)
    assert features.iloc[0]["click_rate_per_min"] != pytest.approx(10 / 3)


def test_context_only_cutoffs_never_expose_final_activity_columns(tmp_path: Path) -> None:
    path = tmp_path / "sessions.csv"
    write_sessions(path, [session_row("s1", "p1", "2026-01-01T10:00:00Z", 0)])
    sessions, _ = load_sessions(path)
    features, relative, mode = make_early_feature_table(sessions)
    assert mode == "context_only_duration_eligibility"
    assert relative == []
    assert "click_rate_per_min" not in features.columns
    assert set(features["cutoff_seconds"]) == {600}


def test_participant_relative_baseline_uses_only_prior_aligned_sessions(tmp_path: Path) -> None:
    sessions_path = tmp_path / "sessions.csv"
    rows = [
        session_row("s1", "p1", "2026-01-01T10:00:00Z", 0),
        session_row("s2", "p1", "2026-01-02T10:00:00Z", 0),
        session_row("s3", "p1", "2026-01-03T10:00:00Z", 1),
    ]
    write_sessions(sessions_path, rows)
    sessions, _ = load_sessions(sessions_path)
    checkpoint_path = tmp_path / "checkpoints.csv"
    checkpoint_rows = []
    for index, session_id in enumerate(["s1", "s2", "s3"], start=1):
        checkpoint_rows.append(
            {
                "sessionId": session_id,
                "anonymousUserId": "p1",
                "cutoffSeconds": 600,
                "capturedAt": f"2026-01-0{index}T10:10:01Z",
                "observable": True,
                "clickCount": index * 3,
                "scrollCount": 0,
                "keyboardActivityCount": 0,
                "idleSeconds": 0,
                "activeSeconds": 600,
                "awaySeconds": 0,
                "tabSwitchCount": 0,
                "videoPlayingSeconds": 0,
            }
        )
    pd.DataFrame(checkpoint_rows, columns=CHECKPOINT_COLUMNS).to_csv(
        checkpoint_path, index=False
    )
    checkpoints = load_checkpoints(checkpoint_path, sessions)
    features, relative, _ = make_early_feature_table(sessions, checkpoints)
    features = features.sort_values("start_time")
    assert "relative_click_rate_per_min" in relative
    assert pd.isna(features.iloc[0]["relative_click_rate_per_min"])
    assert features.iloc[1]["relative_click_rate_per_min"] == pytest.approx(0.3)
    assert features.iloc[2]["relative_click_rate_per_min"] == pytest.approx(0.45)
