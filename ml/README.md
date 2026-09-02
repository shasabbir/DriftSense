# DriftSense Phase 1 data preparation and model development

DriftSense datasets are created from participant CSV files exported by the
extension. This repository does not include generated or real participant data.

Keep consented exports such as `P01.csv` and `P02.csv` in a private,
access-controlled directory outside the repository, then create the combined
modeling table there:

```powershell
python ml/combine_participant_csv.py --input D:\private\driftsense --output D:\private\driftsense\data.csv
```

The merge helper is retained for older exports. The current Phase 1 session
schema is documented in `extension/docs/data-schema.md`; model development
validates that exact 18-column schema. It fails if a file has the wrong schema,
a session ID is duplicated, a duration is invalid, labels disagree with the
post-session answer, or sessions overlap within a participant. Uncertain labels
are reported and excluded from modeling without changing the source file.

Run `python ml/combine_participant_csv.py --help` for argument details. Never
commit real participant exports or the resulting combined dataset.

## Model-development command

Install the dependencies from `ml/requirements.txt`, then run:

```powershell
python ml/model_development.py `
  --sessions D:\private\driftsense\driftsense_merged.csv `
  --checkpoints D:\private\driftsense\driftsense_checkpoints.csv `
  --windows D:\private\driftsense\driftsense_activity_windows.csv `
  --output D:\private\driftsense\model_artifacts `
  --include-random-forest
```

`--checkpoints` is required before the command will freeze a deployable early
model. `--windows` is optional but is required for recent-window features. If
only the session file is supplied, the pipeline evaluates valid context-only
baselines at 3, 5, and 10 minutes and a non-deployable full-session diagnostic.
It never scales final totals backward or treats them as early observations.

Outputs include a data-quality audit, cutoff coverage table, full comparison
table, participant-bootstrap intervals for the selected chronological-holdout
result, and either a blocked freeze decision or a JSON/joblib frozen candidate.
Generated outputs under `ml/artifacts/` are ignored by Git.

### Complete session-end model

To train and package the strongest leakage-safe model supported by the session
CSV alone:

```powershell
python ml/full_session_model.py `
  --sessions D:\private\driftsense\driftsense_merged.csv `
  --output D:\private\driftsense\full_session_model
```

This command tunes regularized logistic feature families with repeated
participant-grouped validation, evaluates the fixed selection on later
participant sessions, refits on every usable label, and writes JSON and joblib
models, shared probability test vectors, coefficient and calibration tables,
and a model card. It is a session-end classifier and is not interchangeable
with the separate checkpoint model.

### Rolling activity technical-pilot model

`python -m ml.train_rolling_activity_model` trains and bundles a compact
logistic model using duration context plus active, idle, and away shares. The
source contains completed-session aggregates, so this artifact is for the
separate technical/usability pilot and shadow-mode prospective validation. Its
session-end holdout metrics are not evidence of rolling early-prediction
performance.

## Analysis workflow

Phase 1 uses participant-relative days 1-7 for participant-grouped development
and later days as a chronological known-participant holdout. Required
comparisons are majority class, timer/prompt-all, intended duration, task site,
task type, activity-only, task-plus-activity, and participant-relative logistic
regression. Checkpoint files provide leakage-safe 3-, 5-, and 10-minute
cumulative features; activity-window files add recent-window features. Random
Forest is an optional offline comparison, and deep sequence models are outside
this pilot.

Phase 2 joins a separate intervention log by `session_id` and compares
randomized reflective-prompt and silent-control sessions. Full implementation
and statistical details are maintained in `implementation_plan.md` and
`paper/main.tex`.
