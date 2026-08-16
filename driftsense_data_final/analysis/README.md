# DriftSense dataset analysis

This directory contains aggregate-only analysis outputs for the participant CSVs in `../participants/`. Do not commit the participant exports or a combined row-level dataset without the study's consent and data-management approval.

## Reproduce the aggregate analysis

From the repository root:

```powershell
python driftsense_data_final\analysis\analyze_dataset.py
python driftsense_data_final\analysis\build_report_artifact.py
```

The analysis uses only Python's standard library. It checks the documented 13-column schema, writes `analysis_summary.json`, and evaluates exploratory baselines with participant-grouped folds. It does not create a row-level combined CSV.

## Rebuild the portable report

From the installed Data Analytics plugin root:

```powershell
npm run report:deliver -- --input "D:\1.msc\DriftSense\driftsense_data_final\analysis\artifact.json" --output "D:\1.msc\DriftSense\driftsense_data_final\analysis\driftsense_insights_report.html"
```

The current report passed canonical validation and structural verification. Interactive browser verification did not run because a compatible installed Chromium executable was unavailable; the self-contained HTML includes semantic chart and table fallbacks.

## Interpretation boundary

`drift_label` is a post-session binary self-report of intention mismatch. It is not a measure of true attention, addiction, ADHD, mental health, emotion, or general productivity. The supplied CSVs contain final session totals only, so they cannot support early prediction at 1, 3, or 5 minutes.
