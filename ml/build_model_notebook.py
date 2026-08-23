"""Build a compact, rerunnable notebook for the latest Phase 1 model run."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import nbformat as nbf


def build_notebook(
    sessions: Path,
    artifacts: Path,
    output: Path,
    include_random_forest: bool,
) -> None:
    summary = json.loads((artifacts / "analysis_summary.json").read_text(encoding="utf-8"))
    quality = summary["data_quality"]
    selection = summary["selection"]
    holdout = selection["chronological_holdout"]
    status_note = (
        "No deployable early model was frozen because the checkpoint CSV was not supplied."
        if not selection["deployable_early_model_created"]
        else "A leakage-safe early Phase 2 candidate was frozen."
    )

    notebook = nbf.v4.new_notebook()
    notebook["metadata"]["kernelspec"] = {
        "display_name": "Python 3",
        "language": "python",
        "name": "python3",
    }
    notebook["metadata"]["language_info"] = {"name": "python", "version": "3"}
    notebook["cells"] = [
        nbf.v4.new_markdown_cell(
            f"""# DriftSense Phase 1 model development

## tl;dr

- The session file has **{quality['rows']} sessions from {quality['participants']} participants** and **{quality['usable_binary_labels']} usable binary labels** ({quality['label_counts']['moved_away_1']} drift, {quality['label_counts']['aligned_0']} aligned).
- The selected full-session diagnostic was `{selection.get('diagnostic_model', selection.get('model'))}`. Its chronological holdout ROC-AUC was **{holdout['roc_auc']:.3f}** and F1 at the development-selected threshold was **{holdout['f1']:.3f}**.
- {status_note} Final-session totals are diagnostic only and are never treated as 3/5/10-minute features.
"""
        ),
        nbf.v4.new_markdown_cell(
            """## Context & Methods

This notebook follows the study plan: uncertain labels are excluded, preprocessing is fitted inside participant-grouped folds, days 1–7 form development data, later participant-relative days form the known-participant chronological holdout, and final-session fields are blocked from early models.

### Key Assumptions

- `start_time` is UTC and participant day 1 begins on each participant's first observed calendar date.
- The supplied file's provenance (synthetic, pilot, or consented Phase 1) must be confirmed outside this file before paper claims or Phase 2 deployment.
- A 35% development prompt-rate ceiling is an explicit operational modeling choice and should be frozen in the protocol before Phase 2.
"""
        ),
        nbf.v4.new_markdown_cell("## Data"),
        nbf.v4.new_code_cell(
            f"""from pathlib import Path
import pandas as pd
from IPython.display import display
from ml.model_development import run_analysis

SESSIONS = Path({str(sessions)!r})
ARTIFACTS = Path({str(artifacts)!r})

summary = run_analysis(
    sessions_path=SESSIONS,
    output_directory=ARTIFACTS,
    development_days=7,
    max_prompt_rate=0.35,
    include_random_forest={include_random_forest!r},
    random_state=2026,
)
quality = pd.DataFrame([summary["data_quality"]]).drop(columns=["warnings", "sessions_per_participant", "cutoff_coverage_binary_labeled"])
display(quality)
display(pd.read_csv(ARTIFACTS / "cutoff_summary.csv"))
"""
        ),
        nbf.v4.new_markdown_cell("## Results"),
        nbf.v4.new_code_cell(
            """comparison = pd.read_csv(ARTIFACTS / "model_comparison.csv")
development = comparison[
    (comparison["evaluation"] == "participant_grouped_development_oof")
    & (comparison["cohort"] == "cutoff_specific")
]
display(
    development[
        ["cutoff_seconds", "model", "n", "prevalence", "roc_auc", "brier", "f1", "prompt_rate"]
    ].sort_values(["cutoff_seconds", "roc_auc"], ascending=[True, False])
)

full_holdout = comparison[
    (comparison["cutoff_seconds"].astype(str) == "full_session_diagnostic")
    & (comparison["evaluation"] == "chronological_known_participant_holdout")
]
display(
    full_holdout[
        ["model", "n", "roc_auc", "brier", "accuracy", "precision", "recall", "f1", "prompt_rate"]
    ].sort_values("roc_auc", ascending=False)
)
display(pd.DataFrame([summary["selection"]]))
"""
        ),
        nbf.v4.new_markdown_cell(
            """## Takeaways

1. The current session table is large enough for a modest population-level pilot model, but not for a high-capacity model per participant.
2. Context-only early baselines are valid because their inputs are known at session start. The full-session activity comparison is retrospective and cannot justify a 3/5/10-minute intervention.
3. Supply the checkpoint CSV to run activity-only, context-plus-activity, and participant-relative early comparisons and unlock the frozen-model artifact. Supply activity windows as well to add recent-window features.
4. Treat discrimination, calibration, coverage, and false-prompt burden together. A model whose confidence interval includes chance should not be presented as established enrichment.
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
    parser.add_argument("--include-random-forest", action="store_true")
    args = parser.parse_args()
    build_notebook(
        args.sessions.resolve(),
        args.artifacts.resolve(),
        args.output.resolve(),
        args.include_random_forest,
    )
    print(args.output.resolve())


if __name__ == "__main__":
    main()
