"""Build the reader-facing notebook for a completed full-session model run."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import nbformat as nbf


def build_notebook(sessions: Path, artifacts: Path, output: Path) -> None:
    summary = json.loads(
        (artifacts / "full_session_summary.json").read_text(encoding="utf-8")
    )
    holdout = summary["chronological_holdout"]
    interval = summary["participant_bootstrap_95_ci"]["roc_auc"]
    notebook = nbf.v4.new_notebook()
    notebook["metadata"]["kernelspec"] = {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3",
    }
    notebook["metadata"]["language_info"] = {"name": "python", "version": "3"}
    notebook["cells"] = [
        nbf.v4.new_markdown_cell(
            f"""# DriftSense full-session model

## tl;dr

- Trained on **{summary['split']['final_training_rows']} usable sessions** from **{summary['data_quality']['participants']} participants**.
- Repeated participant-grouped development selected `{summary['selected_model']}` with `C={summary['regularization_c']}`.
- On **{summary['split']['chronological_holdout_rows']} later sessions**, ROC-AUC was **{holdout['roc_auc']:.3f}** (participant-bootstrap 95% CI **{interval[0]:.3f}–{interval[1]:.3f}**), precision was **{holdout['precision']:.3f}**, recall was **{holdout['recall']:.3f}**, and F1 was **{holdout['f1']:.3f}** at the development-selected threshold.
- The final JSON artifact matches the Python pipeline to a maximum absolute probability error of **{summary['artifact_probability_parity_max_abs_error']:.2e}** across shared test vectors.
"""
        ),
        nbf.v4.new_markdown_cell(
            """## Context & Methods

The model predicts the later binary post-session alignment answer from information available after the task session ends. It does not use the answer itself. Candidate feature families and regularization were selected with five repeats of participant-grouped five-fold validation on participant-relative days 1–7. The selected configuration and threshold were evaluated once on later sessions.

### Key Assumptions

- Session rows are the unit of analysis and participant IDs define validation groups.
- Prior-session calibration features use only earlier session outcomes and activity.
- The positive-decision cap is 35% in development data.
- Participant IDs are never predictive inputs.
"""
        ),
        nbf.v4.new_markdown_cell("## Data"),
        nbf.v4.new_code_cell(
            f"""from pathlib import Path
import pandas as pd
from IPython.display import display
from ml.full_session_model import run_full_session_training

SESSIONS = Path({str(sessions)!r})
ARTIFACTS = Path({str(artifacts)!r})

summary = run_full_session_training(
    sessions_path=SESSIONS,
    output_directory=ARTIFACTS,
    development_days=7,
    repeats=5,
    folds=5,
    max_positive_rate=0.35,
)
quality = summary["data_quality"]
display(pd.DataFrame([{{
    "sessions": quality["rows"],
    "participants": quality["participants"],
    "usable_labels": quality["usable_binary_labels"],
    "excluded_uncertain_or_missing": quality["excluded_uncertain_or_missing_labels"],
    "drift_prevalence": quality["drift_prevalence"],
    "duplicate_session_ids": quality["duplicate_session_ids"],
    "overlapping_sessions": quality["overlapping_sessions"],
}}]))
display(pd.DataFrame([summary["split"]]))
"""
        ),
        nbf.v4.new_markdown_cell("## Results"),
        nbf.v4.new_code_cell(
            """tuning = pd.read_csv(ARTIFACTS / "full_session_tuning.csv")
best_tuning = (
    tuning.sort_values(["model", "roc_auc", "brier"], ascending=[True, False, True])
    .groupby("model", as_index=False)
    .first()
)
display(best_tuning[["model", "regularization_c", "roc_auc", "brier", "f1", "prompt_rate"]].sort_values("roc_auc", ascending=False))

comparison = pd.read_csv(ARTIFACTS / "full_session_model_comparison.csv")
holdout = comparison[comparison["evaluation"] == "chronological_known_participant_holdout"]
display(holdout[["model", "regularization_c", "n", "roc_auc", "brier", "accuracy", "precision", "recall", "f1", "prompt_rate"]].sort_values("roc_auc", ascending=False))

display(pd.read_csv(ARTIFACTS / "full_session_calibration.csv"))
display(pd.read_csv(ARTIFACTS / "full_session_coefficients.csv").head(15))
display(pd.DataFrame([summary["chronological_holdout"]]))
"""
        ),
        nbf.v4.new_markdown_cell(
            """## Takeaways

1. Activity provides more grouped-development discrimination than task context alone, but uncertainty across participants remains material.
2. The threshold trades accuracy for recall and must be reported together with its false-positive burden.
3. The final artifact is appropriate for session-end research use. A separate cutoff feature export and validation run are required for an in-session intervention model.
4. The participant-resampled confidence interval and calibration table should accompany any paper claim; a single accuracy value would be misleading for this class balance.
"""
        ),
    ]
    output.parent.mkdir(parents=True, exist_ok=True)
    nbf.write(notebook, output)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sessions", type=Path, required=True)
    parser.add_argument("--artifacts", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    build_notebook(
        args.sessions.resolve(), args.artifacts.resolve(), args.output.resolve()
    )
    print(args.output.resolve())


if __name__ == "__main__":
    main()
