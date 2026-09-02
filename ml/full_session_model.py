"""Train and package DriftSense's complete session-end classifier.

This pipeline uses only fields available when a task session has ended and
before the participant submits the post-session alignment answer. Participant
IDs are used for grouped validation and prior-session calibration, never as
predictive inputs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, roc_auc_score
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

try:
    from ml.model_development import (
        ACTIVITY_FEATURES,
        CONTEXT_CATEGORICAL,
        DataValidationError,
        classification_metrics,
        choose_threshold,
        load_sessions,
        make_full_session_diagnostic_table,
        participant_bootstrap_ci,
    )
except ModuleNotFoundError:  # Support `python ml/full_session_model.py`.
    from model_development import (
        ACTIVITY_FEATURES,
        CONTEXT_CATEGORICAL,
        DataValidationError,
        classification_metrics,
        choose_threshold,
        load_sessions,
        make_full_session_diagnostic_table,
        participant_bootstrap_ci,
    )


RANDOM_STATE = 2026
REGULARIZATION_GRID = (0.01, 0.03, 0.1, 0.3, 1.0, 3.0)


@dataclass(frozen=True)
class Candidate:
    name: str
    numeric: tuple[str, ...]
    categorical: tuple[str, ...]
    complexity: int
    uses_participant_calibration: bool = False


def _json_value(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    if isinstance(value, np.integer):
        return int(value)
    if isinstance(value, np.floating):
        return None if np.isnan(value) else float(value)
    if isinstance(value, np.bool_):
        return bool(value)
    if value is None:
        return None
    try:
        return None if pd.isna(value) else value
    except (TypeError, ValueError):
        return value


def write_json(path: Path, payload: dict[str, Any] | list[Any]) -> None:
    path.write_text(json.dumps(_json_value(payload), indent=2), encoding="utf-8")


def make_full_session_features(sessions: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Create session-end and prior-session features without using the outcome."""
    frame, relative_features = make_full_session_diagnostic_table(sessions)
    log_columns = [
        "duration_seconds",
        "intended_duration_minutes",
        "task_site_count",
        "click_count",
        "scroll_count",
        "keyboard_activity_count",
        "idle_seconds",
        "active_seconds",
        "away_seconds",
        "tab_switch_count",
        "video_playing_seconds",
    ]
    for column in log_columns:
        frame[f"log1p_{column}"] = np.log1p(frame[column].astype(float))
    frame["log_elapsed_to_intended_ratio"] = np.log1p(
        frame["elapsed_to_intended_ratio"].clip(lower=0)
    )
    hour = frame["start_time"].dt.hour + frame["start_time"].dt.minute / 60.0
    weekday = frame["start_time"].dt.dayofweek
    frame["start_hour_sin"] = np.sin(2 * np.pi * hour / 24)
    frame["start_hour_cos"] = np.cos(2 * np.pi * hour / 24)
    frame["weekday_sin"] = np.sin(2 * np.pi * weekday / 7)
    frame["weekday_cos"] = np.cos(2 * np.pi * weekday / 7)
    return frame, relative_features


def candidate_models(relative_features: list[str]) -> list[Candidate]:
    activity = tuple(
        [
            *ACTIVITY_FEATURES,
            "log1p_duration_seconds",
            "log1p_click_count",
            "log1p_scroll_count",
            "log1p_keyboard_activity_count",
            "log1p_idle_seconds",
            "log1p_active_seconds",
            "log1p_away_seconds",
            "log1p_tab_switch_count",
            "log1p_video_playing_seconds",
        ]
    )
    context = (
        "log1p_intended_duration_minutes",
        "log1p_task_site_count",
        "log_elapsed_to_intended_ratio",
    )
    temporal = ("start_hour_sin", "start_hour_cos", "weekday_sin", "weekday_cos")
    participant = (
        "prior_labeled_session_count",
        "prior_drift_rate",
        "participant_baseline_available",
        *relative_features,
    )
    return [
        Candidate(
            "intended_duration_only",
            ("log1p_intended_duration_minutes", "log_elapsed_to_intended_ratio"),
            (),
            0,
        ),
        Candidate("task_site_domain_only", (), ("initial_task_site",), 0),
        Candidate("task_type_only", (), ("task_type",), 0),
        Candidate("context_only", context, tuple(CONTEXT_CATEGORICAL), 1),
        Candidate("activity_only", activity, (), 2),
        Candidate(
            "context_activity",
            context + activity,
            tuple(CONTEXT_CATEGORICAL),
            3,
        ),
        Candidate(
            "context_activity_time",
            context + activity + temporal,
            tuple(CONTEXT_CATEGORICAL),
            4,
        ),
        Candidate(
            "participant_calibrated_context_activity",
            context + activity + temporal + participant,
            tuple(CONTEXT_CATEGORICAL),
            5,
            uses_participant_calibration=True,
        ),
    ]


def build_pipeline(candidate: Candidate, regularization_c: float) -> Pipeline:
    transformers: list[tuple[str, Pipeline, list[str]]] = []
    if candidate.numeric:
        transformers.append(
            (
                "numeric",
                Pipeline(
                    [
                        ("imputer", SimpleImputer(strategy="median")),
                        ("scaler", StandardScaler()),
                    ]
                ),
                list(candidate.numeric),
            )
        )
    if candidate.categorical:
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
                list(candidate.categorical),
            )
        )
    preprocessing = ColumnTransformer(
        transformers,
        remainder="drop",
        verbose_feature_names_out=False,
    )
    classifier = LogisticRegression(
        C=regularization_c,
        l1_ratio=0.0,
        solver="lbfgs",
        max_iter=3000,
        random_state=RANDOM_STATE,
    )
    return Pipeline([("preprocess", preprocessing), ("classifier", classifier)])


def repeated_grouped_oof(
    frame: pd.DataFrame,
    candidate: Candidate,
    regularization_c: float,
    repeats: int,
    folds: int,
) -> pd.DataFrame:
    y = frame["drift_label"].astype(int).to_numpy()
    groups = frame["participant_id"].astype(str).to_numpy()
    unique_groups = np.unique(groups)
    folds = min(folds, len(unique_groups))
    if folds < 2:
        raise DataValidationError("At least two participant groups are required")
    probability_sum = np.zeros(len(frame), dtype=float)
    prediction_count = np.zeros(len(frame), dtype=int)
    for repeat in range(repeats):
        splitter = StratifiedGroupKFold(
            n_splits=folds,
            shuffle=True,
            random_state=RANDOM_STATE + repeat,
        )
        for train_index, validation_index in splitter.split(frame, y, groups):
            pipeline = build_pipeline(candidate, regularization_c)
            pipeline.fit(frame.iloc[train_index], y[train_index])
            probability_sum[validation_index] += pipeline.predict_proba(
                frame.iloc[validation_index]
            )[:, 1]
            prediction_count[validation_index] += 1
    if (prediction_count != repeats).any():
        raise RuntimeError("Repeated grouped validation did not score every row once per repeat")
    return pd.DataFrame(
        {
            "participant_id": groups,
            "label": y,
            "probability": probability_sum / prediction_count,
        }
    )


def tune_candidates(
    development: pd.DataFrame,
    candidates: list[Candidate],
    repeats: int,
    folds: int,
) -> tuple[pd.DataFrame, dict[str, tuple[Candidate, float, pd.DataFrame]]]:
    rows: list[dict[str, Any]] = []
    selected_by_family: dict[str, tuple[Candidate, float, pd.DataFrame]] = {}
    for candidate in candidates:
        family_results: list[tuple[float, dict[str, Any], pd.DataFrame]] = []
        for regularization_c in REGULARIZATION_GRID:
            predictions = repeated_grouped_oof(
                development,
                candidate,
                regularization_c,
                repeats,
                folds,
            )
            metrics = classification_metrics(
                predictions["label"].to_numpy(), predictions["probability"].to_numpy()
            )
            row = {
                "model": candidate.name,
                "regularization_c": regularization_c,
                "evaluation": "repeated_participant_grouped_development_oof",
                "repeats": repeats,
                "folds": folds,
                **metrics,
            }
            rows.append(row)
            family_results.append((regularization_c, metrics, predictions))
        best_c, _, best_predictions = max(
            family_results,
            key=lambda item: (item[1]["roc_auc"], -item[1]["brier"], -item[0]),
        )
        selected_by_family[candidate.name] = (candidate, best_c, best_predictions)
    return pd.DataFrame(rows), selected_by_family


def select_candidate(
    tuning_results: pd.DataFrame,
    candidates: list[Candidate],
) -> tuple[Candidate, float]:
    best_per_family = (
        tuning_results.sort_values(
            ["model", "roc_auc", "brier", "regularization_c"],
            ascending=[True, False, True, True],
        )
        .groupby("model", as_index=False)
        .first()
    )
    best_auc = float(best_per_family["roc_auc"].max())
    near_best = best_per_family[best_per_family["roc_auc"] >= best_auc - 0.01].copy()
    complexity = {candidate.name: candidate.complexity for candidate in candidates}
    near_best["complexity"] = near_best["model"].map(complexity)
    selected_row = near_best.sort_values(
        ["complexity", "brier", "regularization_c"]
    ).iloc[0]
    selected_candidate = next(
        candidate for candidate in candidates if candidate.name == selected_row["model"]
    )
    return selected_candidate, float(selected_row["regularization_c"])


def calibration_table(predictions: pd.DataFrame, bins: int = 5) -> pd.DataFrame:
    frame = predictions.copy()
    frame["bin"] = pd.qcut(frame["probability"], q=bins, duplicates="drop")
    table = frame.groupby("bin", observed=True).agg(
        sessions=("label", "size"),
        mean_predicted_probability=("probability", "mean"),
        observed_drift_rate=("label", "mean"),
        probability_min=("probability", "min"),
        probability_max=("probability", "max"),
    )
    return table.reset_index(drop=True)


def fit_and_score_holdout(
    development: pd.DataFrame,
    holdout: pd.DataFrame,
    candidate: Candidate,
    regularization_c: float,
) -> tuple[Pipeline, pd.DataFrame]:
    pipeline = build_pipeline(candidate, regularization_c)
    pipeline.fit(development, development["drift_label"].astype(int))
    return pipeline, pd.DataFrame(
        {
            "participant_id": holdout["participant_id"].astype(str).to_numpy(),
            "label": holdout["drift_label"].astype(int).to_numpy(),
            "probability": pipeline.predict_proba(holdout)[:, 1],
        }
    )


def serialize_pipeline(
    pipeline: Pipeline,
    candidate: Candidate,
    regularization_c: float,
    threshold: float,
    source_hash: str,
    training_rows: int,
    metrics: dict[str, Any],
) -> dict[str, Any]:
    preprocess: ColumnTransformer = pipeline.named_steps["preprocess"]
    classifier: LogisticRegression = pipeline.named_steps["classifier"]
    numeric_preprocessing: dict[str, Any] = {}
    categorical_encoding: dict[str, Any] = {}
    if candidate.numeric:
        numeric_pipeline: Pipeline = preprocess.named_transformers_["numeric"]
        imputer: SimpleImputer = numeric_pipeline.named_steps["imputer"]
        scaler: StandardScaler = numeric_pipeline.named_steps["scaler"]
        for index, feature in enumerate(candidate.numeric):
            numeric_preprocessing[feature] = {
                "impute_median": float(imputer.statistics_[index]),
                "mean": float(scaler.mean_[index]),
                "scale": float(scaler.scale_[index]),
            }
    if candidate.categorical:
        categorical_pipeline: Pipeline = preprocess.named_transformers_["categorical"]
        imputer = categorical_pipeline.named_steps["imputer"]
        encoder: OneHotEncoder = categorical_pipeline.named_steps["encoder"]
        for index, feature in enumerate(candidate.categorical):
            categorical_encoding[feature] = {
                "impute_value": str(imputer.statistics_[index]),
                "categories": [str(value) for value in encoder.categories_[index]],
                "unknown_policy": "all_zero",
            }
    version_seed = (
        f"{source_hash}:{candidate.name}:{regularization_c}:{training_rows}"
    ).encode("utf-8")
    version = hashlib.sha256(version_seed).hexdigest()[:12]
    return {
        "artifact_status": "trained_full_session_model",
        "model_version": f"driftsense-full-session-{version}",
        "model_scope": "session_end_before_post_session_answer",
        "label_definition": {"aligned": 0, "moved_away": 1},
        "selected_model": candidate.name,
        "regularization": {"penalty": "l2", "C": regularization_c},
        "source_columns": {
            "numeric": list(candidate.numeric),
            "categorical": list(candidate.categorical),
        },
        "feature_order": [str(name) for name in preprocess.get_feature_names_out()],
        "numeric_preprocessing": numeric_preprocessing,
        "categorical_encoding": categorical_encoding,
        "participant_calibration": {
            "enabled": candidate.uses_participant_calibration,
            "uses_prior_sessions_only": candidate.uses_participant_calibration,
        },
        "coefficients": classifier.coef_[0].astype(float).tolist(),
        "intercept": float(classifier.intercept_[0]),
        "decision_threshold": float(threshold),
        "training_rows": training_rows,
        "training_source_sha256": source_hash,
        "chronological_holdout_metrics": metrics,
        "intended_use": "Research analysis and optional session-end risk estimation.",
        "unsupported_use": "Do not use this artifact as a mid-session checkpoint predictor.",
    }


def predict_from_artifact(artifact: dict[str, Any], record: dict[str, Any]) -> float:
    transformed: list[float] = []
    for feature in artifact["source_columns"]["numeric"]:
        spec = artifact["numeric_preprocessing"][feature]
        value = record.get(feature)
        if value is None or (isinstance(value, float) and math.isnan(value)):
            value = spec["impute_median"]
        transformed.append((float(value) - spec["mean"]) / spec["scale"])
    for feature in artifact["source_columns"]["categorical"]:
        spec = artifact["categorical_encoding"][feature]
        value = record.get(feature)
        if value is None:
            value = spec["impute_value"]
        transformed.extend(1.0 if str(value) == category else 0.0 for category in spec["categories"])
    coefficients = np.asarray(artifact["coefficients"], dtype=float)
    if len(transformed) != len(coefficients):
        raise ValueError("Serialized feature vector does not match coefficient count")
    logit = float(artifact["intercept"] + np.dot(coefficients, transformed))
    return 1.0 / (1.0 + math.exp(-logit))


def build_test_vectors(
    frame: pd.DataFrame,
    pipeline: Pipeline,
    artifact: dict[str, Any],
    count: int = 7,
) -> list[dict[str, Any]]:
    probability = pipeline.predict_proba(frame)[:, 1]
    targets = np.linspace(0, 1, count)
    chosen: list[int] = []
    for quantile in targets:
        target = float(np.quantile(probability, quantile))
        available = np.argsort(np.abs(probability - target))
        index = next(int(item) for item in available if int(item) not in chosen)
        chosen.append(index)
    vectors = []
    source_features = [
        *artifact["source_columns"]["numeric"],
        *artifact["source_columns"]["categorical"],
    ]
    for vector_number, index in enumerate(chosen, start=1):
        record = {
            feature: _json_value(frame.iloc[index][feature]) for feature in source_features
        }
        sklearn_probability = float(probability[index])
        artifact_probability = predict_from_artifact(artifact, record)
        if abs(sklearn_probability - artifact_probability) > 1e-12:
            raise RuntimeError("JSON probability does not match the fitted sklearn pipeline")
        vectors.append(
            {
                "vector_id": f"full_session_{vector_number}",
                "features": record,
                "expected_probability": sklearn_probability,
                "expected_prediction": int(
                    sklearn_probability >= artifact["decision_threshold"]
                ),
            }
        )
    return vectors


def write_model_card(
    path: Path,
    summary: dict[str, Any],
    artifact: dict[str, Any],
) -> None:
    quality = summary["data_quality"]
    holdout = summary["chronological_holdout"]
    ci = summary["participant_bootstrap_95_ci"]
    threshold = summary["threshold_selection"]
    content = f"""# DriftSense full-session model card

## Model overview

- Version: `{artifact['model_version']}`
- Model: L2-regularized logistic regression (`{artifact['selected_model']}`)
- Timing: after a declared task session ends and before the post-session answer
- Outcome: participant-reported goal deviation (`aligned=0`, `moved_away=1`)
- Training rows: {artifact['training_rows']}

Participant identifiers are not model inputs. They are used only to construct grouped validation splits and leakage-safe prior-session features when the selected feature family requires them.

## Data and validation

- Sessions inspected: {quality['rows']}
- Participants: {quality['participants']}
- Usable binary labels: {quality['usable_binary_labels']}
- Excluded uncertain/missing labels: {quality['excluded_uncertain_or_missing_labels']}
- Development period: participant-relative days 1–7
- Final evaluation: later sessions from known participants
- Model selection: five repeats of five-fold participant-grouped validation

## Held-out performance

At the development-selected threshold `{threshold['threshold']:.6f}`:

- ROC-AUC: {holdout['roc_auc']:.3f} (participant-bootstrap 95% CI {ci['roc_auc'][0]:.3f}–{ci['roc_auc'][1]:.3f})
- Accuracy: {holdout['accuracy']:.3f}
- Precision: {holdout['precision']:.3f}
- Recall: {holdout['recall']:.3f}
- F1: {holdout['f1']:.3f}
- Brier score: {holdout['brier']:.3f}
- Positive-decision rate: {holdout['prompt_rate']:.3f}
- False-positive share among positive decisions: {holdout['false_prompt_share_of_prompts']:.3f}

## Intended use

This artifact supports research analysis and optional session-end risk estimation. It may help prioritize when to request a normal post-session reflection, but it does not determine the participant's label.

## Limitations and prohibited interpretations

- This is a session-end model. It is not valid at 3, 5, or 10 minutes.
- Performance is population-level and participant-calibrated only where prior-session features are explicitly present; it is not a separately trained personal model.
- The model estimates association with a later self-report. It does not detect attention, productivity, addiction, emotion, or mental health.
- The participant count is small, so participant-resampled uncertainty must accompany headline metrics.
- The threshold was selected under a 35% development positive-decision cap; operational rates may differ in later data.
- The model must not replace the participant's explicit reflection response.
"""
    path.write_text(content, encoding="utf-8")


def run_full_session_training(
    sessions_path: Path,
    output_directory: Path,
    development_days: int = 7,
    repeats: int = 5,
    folds: int = 5,
    max_positive_rate: float = 0.35,
) -> dict[str, Any]:
    output_directory.mkdir(parents=True, exist_ok=True)
    sessions, quality = load_sessions(sessions_path)
    features, relative_features = make_full_session_features(sessions)
    labeled = features[features["drift_label"].isin([0, 1])].copy()
    development = labeled[labeled["day_index"] <= development_days].reset_index(drop=True)
    holdout = labeled[labeled["day_index"] > development_days].reset_index(drop=True)
    if development.empty or holdout.empty:
        raise DataValidationError("Both development and chronological holdout rows are required")

    candidates = candidate_models(relative_features)
    tuning_results, tuned = tune_candidates(development, candidates, repeats, folds)
    selected_candidate, selected_c = select_candidate(tuning_results, candidates)
    selected_oof = tuned[selected_candidate.name][2]
    threshold_selection = choose_threshold(
        selected_oof["label"].to_numpy(),
        selected_oof["probability"].to_numpy(),
        max_positive_rate,
    )

    comparison_rows: list[dict[str, Any]] = []
    development_prevalence = float(development["drift_label"].mean())
    for evaluation, target in [
        ("repeated_participant_grouped_development_oof", development),
        ("chronological_known_participant_holdout", holdout),
    ]:
        labels = target["drift_label"].astype(int).to_numpy()
        for model_name, probability in [
            ("majority_class", np.full(len(target), development_prevalence)),
            ("fixed_timer_prompt_all", np.ones(len(target))),
        ]:
            comparison_rows.append(
                {
                    "model": model_name,
                    "regularization_c": np.nan,
                    "evaluation": evaluation,
                    **classification_metrics(labels, probability),
                }
            )
    for candidate in candidates:
        tuned_candidate, best_c, oof = tuned[candidate.name]
        _, holdout_predictions = fit_and_score_holdout(
            development, holdout, tuned_candidate, best_c
        )
        for evaluation, predictions in [
            ("repeated_participant_grouped_development_oof", oof),
            ("chronological_known_participant_holdout", holdout_predictions),
        ]:
            comparison_rows.append(
                {
                    "model": candidate.name,
                    "regularization_c": best_c,
                    "evaluation": evaluation,
                    **classification_metrics(
                        predictions["label"].to_numpy(),
                        predictions["probability"].to_numpy(),
                    ),
                }
            )

    selected_development_model, holdout_predictions = fit_and_score_holdout(
        development, holdout, selected_candidate, selected_c
    )
    holdout_default_metrics = classification_metrics(
        holdout_predictions["label"].to_numpy(),
        holdout_predictions["probability"].to_numpy(),
    )
    holdout_metrics = classification_metrics(
        holdout_predictions["label"].to_numpy(),
        holdout_predictions["probability"].to_numpy(),
        threshold_selection["threshold"],
    )
    bootstrap = participant_bootstrap_ci(
        holdout_predictions,
        threshold_selection["threshold"],
        repetitions=2000,
        random_state=RANDOM_STATE,
    )
    calibration = calibration_table(holdout_predictions)

    final_pipeline = build_pipeline(selected_candidate, selected_c)
    final_pipeline.fit(labeled, labeled["drift_label"].astype(int))
    artifact = serialize_pipeline(
        final_pipeline,
        selected_candidate,
        selected_c,
        threshold_selection["threshold"],
        quality["sha256"],
        len(labeled),
        holdout_metrics,
    )
    test_vectors = build_test_vectors(labeled, final_pipeline, artifact)
    transformed_names = artifact["feature_order"]
    coefficients = pd.DataFrame(
        {
            "transformed_feature": transformed_names,
            "coefficient": artifact["coefficients"],
        }
    )
    coefficients["absolute_coefficient"] = coefficients["coefficient"].abs()
    coefficients = coefficients.sort_values("absolute_coefficient", ascending=False)

    joblib.dump(final_pipeline, output_directory / "full_session_model.joblib")
    write_json(output_directory / "full_session_model.json", artifact)
    write_json(output_directory / "full_session_test_vectors.json", test_vectors)
    tuning_results.to_csv(output_directory / "full_session_tuning.csv", index=False)
    pd.DataFrame(comparison_rows).to_csv(
        output_directory / "full_session_model_comparison.csv", index=False
    )
    calibration.to_csv(output_directory / "full_session_calibration.csv", index=False)
    coefficients.to_csv(output_directory / "full_session_coefficients.csv", index=False)

    selected_development_metrics = classification_metrics(
        selected_oof["label"].to_numpy(), selected_oof["probability"].to_numpy()
    )
    summary = {
        "status": "complete",
        "model_version": artifact["model_version"],
        "model_scope": artifact["model_scope"],
        "selected_model": selected_candidate.name,
        "regularization_c": selected_c,
        "selection_rule": (
            "Highest repeated participant-grouped development ROC-AUC; models within 0.01 "
            "use the simpler feature family, then lower Brier score."
        ),
        "data_quality": quality,
        "split": {
            "development_days": development_days,
            "development_rows": len(development),
            "development_participants": int(development["participant_id"].nunique()),
            "chronological_holdout_rows": len(holdout),
            "chronological_holdout_participants": int(holdout["participant_id"].nunique()),
            "final_training_rows": len(labeled),
        },
        "repeated_grouped_development": selected_development_metrics,
        "threshold_selection": threshold_selection,
        "chronological_holdout_default_threshold": holdout_default_metrics,
        "chronological_holdout": holdout_metrics,
        "participant_bootstrap_95_ci": bootstrap,
        "artifact_probability_parity_max_abs_error": max(
            abs(
                vector["expected_probability"]
                - predict_from_artifact(artifact, vector["features"])
            )
            for vector in test_vectors
        ),
        "artifacts": {
            "model_json": str((output_directory / "full_session_model.json").resolve()),
            "model_joblib": str((output_directory / "full_session_model.joblib").resolve()),
            "test_vectors": str(
                (output_directory / "full_session_test_vectors.json").resolve()
            ),
            "model_comparison": str(
                (output_directory / "full_session_model_comparison.csv").resolve()
            ),
            "calibration": str(
                (output_directory / "full_session_calibration.csv").resolve()
            ),
            "coefficients": str(
                (output_directory / "full_session_coefficients.csv").resolve()
            ),
            "tuning": str((output_directory / "full_session_tuning.csv").resolve()),
            "model_card": str(
                (output_directory / "FULL_SESSION_MODEL_CARD.md").resolve()
            ),
        },
    }
    write_json(output_directory / "full_session_summary.json", summary)
    write_model_card(output_directory / "FULL_SESSION_MODEL_CARD.md", summary, artifact)
    return summary


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sessions", type=Path, required=True)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("ml/artifacts/full_session_model"),
    )
    parser.add_argument("--development-days", type=int, default=7)
    parser.add_argument("--repeats", type=int, default=5)
    parser.add_argument("--folds", type=int, default=5)
    parser.add_argument("--max-positive-rate", type=float, default=0.35)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    summary = run_full_session_training(
        sessions_path=args.sessions.resolve(),
        output_directory=args.output.resolve(),
        development_days=args.development_days,
        repeats=args.repeats,
        folds=args.folds,
        max_positive_rate=args.max_positive_rate,
    )
    print(json.dumps(_json_value(summary), indent=2))


if __name__ == "__main__":
    main()
