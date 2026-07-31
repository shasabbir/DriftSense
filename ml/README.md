# DriftSense participant data preparation

DriftSense datasets are created from participant CSV files exported by the
extension. This repository does not include generated or real participant data.

Keep consented exports such as `P01.csv` and `P02.csv` in a private,
access-controlled directory outside the repository, then create the combined
modeling table there:

```powershell
python ml/combine_participant_csv.py --input D:\private\driftsense --output D:\private\driftsense\data.csv
```

The merge requires the extension's exact 13-column schema. It fails if a file
has the wrong schema, its filename disagrees with `participant_id`, a session ID
is duplicated, a duration is invalid, or sessions overlap within a participant.
Incomplete and non-binary-labeled sessions are reported and excluded from the
combined modeling table without changing the source files.

Run `python ml/combine_participant_csv.py --help` for argument details. Never
commit real participant exports or the resulting combined dataset.

## Planned Analysis Workflow

Phase 1 uses days 1-7 for participant-grouped development and days 8-10 for a
chronological holdout. Required comparisons are time, domain, intention-only,
activity-only, and intention-plus-activity logistic regression. Activity-window
files provide leakage-safe one-, three-, and five-minute features; the deployed
intervention uses the frozen three-minute logistic model. Random Forest is an
optional offline comparison, and deep sequence models are outside this pilot.

Phase 2 joins a separate intervention log by `session_id` and compares
randomized reflective-prompt and silent-control sessions. Full implementation
and statistical details are maintained in `implementation_plan.md` and
`paper/main.tex`.
