"""Build the canonical Data Analytics report artifact from aggregate results."""

from __future__ import annotations

import json
from pathlib import Path

from analyze_dataset import SOURCE_SQL


ANALYSIS_DIR = Path(__file__).resolve().parent
SUMMARY_PATH = ANALYSIS_DIR / "analysis_summary.json"
ARTIFACT_PATH = ANALYSIS_DIR / "artifact.json"
NOTES_PATH = ANALYSIS_DIR / "report_notes.json"


def pct(value: float, digits: int = 1) -> str:
    return f"{value * 100:.{digits}f}%"


def pp(value: float, digits: int = 1) -> str:
    sign = "+" if value >= 0 else ""
    return f"{sign}{value * 100:.{digits}f} percentage points"


def source(source_id: str, label: str, path: str) -> dict:
    return {"id": source_id, "label": label, "path": path}


def main() -> None:
    summary = json.loads(SUMMARY_PATH.read_text(encoding="utf-8"))
    outcome = summary["outcome"]
    contrasts = summary["intention_contrasts"]
    chronology = summary["chronology"]
    models = summary["exploratory_models"]
    quality = summary["data_quality"]

    intention_dataset = [
        {
            "intention": item["label"],
            "sessions": item["sessions"],
            "participant_coverage": item["participant_coverage"],
            "drift_rate": item["drift_rate"],
            "ci_lower": item["ci_95"][0],
            "ci_upper": item["ci_95"][1],
            "median_duration_minutes": item["median_duration_minutes"],
        }
        for item in summary["intentions"]
    ]
    model_order = ["majority", "time_threshold", "domain", "intention", "activity", "combined"]
    model_labels = {
        "majority": "Majority class",
        "time_threshold": "Time threshold",
        "domain": "Domain",
        "intention": "Intention only",
        "activity": "Activity only",
        "combined": "Intention + activity",
    }
    model_dataset = [
        {
            "model": model_labels[name],
            "roc_auc": models[name]["roc_auc"],
            "auc_ci_lower": models[name]["roc_auc_ci_95_participant_bootstrap"][0],
            "auc_ci_upper": models[name]["roc_auc_ci_95_participant_bootstrap"][1],
            "accuracy": models[name]["accuracy"],
            "precision": models[name]["precision"],
            "recall": models[name]["recall"],
            "f1": models[name]["f1"],
        }
        for name in model_order
    ]
    activity_dataset = [
        {
            "signal": item["signal"],
            "relative_difference": item["relative_difference"],
            "aligned_median": item["aligned_median"],
            "drift_median": item["drift_median"],
            "unit": item["unit"],
        }
        for item in summary["activity_medians"]
    ]
    quality_dataset = [
        {"check": "Required 13-column schema", "status": "Pass", "evidence": "All 18 files match"},
        {"check": "Missing values", "status": "Pass", "evidence": "0 missing cells"},
        {"check": "Session uniqueness", "status": "Pass", "evidence": "0 duplicate session IDs"},
        {"check": "Participant-time overlaps", "status": "Pass", "evidence": "0 overlaps"},
        {"check": "Range validity", "status": "Pass", "evidence": "0 negative counts; idle never exceeds duration"},
        {
            "check": "Timestamp naturalness",
            "status": "Review",
            "evidence": f"{pct(quality['quarter_hour_start_share'])} start exactly on a quarter-hour",
        },
        {
            "check": "Label completeness",
            "status": "Review",
            "evidence": "633/633 sessions have binary labels",
        },
    ]

    canonical_sources = [
        source(
            "participant_exports",
            "DriftSense participant session exports (18 CSV files)",
            "driftsense_data_final/participants/*.csv",
        ),
        source(
            "aggregate_analysis",
            "Reproducible aggregate analysis summary",
            "driftsense_data_final/analysis/analysis_summary.json",
        ),
        source(
            "analysis_code",
            "Standard-library analysis code",
            "driftsense_data_final/analysis/analyze_dataset.py",
        ),
    ]
    canonical_sources[1]["query"] = {
        "engine": "sqlite",
        "language": "sql",
        "sql": SOURCE_SQL,
        "description": "Selects validated session rows from an in-memory SQLite table loaded from the 18 CSV exports; the reviewed Python script then computes the aggregate report datasets.",
        "executed_at": summary["source"]["generated_at"],
        "tables_used": ["driftsense_data_final/participants/*.csv"],
        "filters": [
            "All rows in the 18 supplied participant CSV files",
            "Binary post-session labels only; the supplied files contain no missing/non-binary labels",
            "Participant-grouped folds for exploratory model evaluation",
        ],
        "metric_definitions": [
            "Self-reported drift rate = sessions with drift_label = 1 divided by labeled sessions.",
            "ROC-AUC = threshold-independent ranking performance on held-out participants.",
            "Confidence intervals = percentile intervals from participant-clustered bootstrap resamples.",
        ],
    }

    title = "DriftSense Dataset Insights"
    executive_summary = f"""## Executive Summary

- **Declared intention is the clearest separator.** Open-ended browsing has a {pct(next(item['drift_rate'] for item in summary['intentions'] if item['intention'] == 'open_ended_browsing'))} self-reported drift rate, {pp(contrasts['open_ended_minus_task_directed']['difference'])} above task-directed sessions; the participant-bootstrap 95% interval is {pp(contrasts['open_ended_minus_task_directed']['ci_95_participant_bootstrap'][0])} to {pp(contrasts['open_ended_minus_task_directed']['ci_95_participant_bootstrap'][1])}.
- **Domain alone is weak.** Its participant-held-out ROC-AUC is {models['domain']['roc_auc']:.3f}, while the same domain—especially YouTube—contains both low- and high-drift intention contexts.
- **Combining intention with full-session activity improves ranking, but only modestly.** The exploratory combined model reaches ROC-AUC {models['combined']['roc_auc']:.3f} (95% participant-bootstrap interval {models['combined']['roc_auc_ci_95_participant_bootstrap'][0]:.3f}–{models['combined']['roc_auc_ci_95_participant_bootstrap'][1]:.3f}), above intention-only ({models['intention']['roc_auc']:.3f}) and activity-only ({models['activity']['roc_auc']:.3f}). This is not an early-prediction result.
- **Treat the dataset as synthetic or heavily curated until provenance is confirmed.** All 633 rows are complete and binary-labeled, and {pct(quality['quarter_hour_start_share'])} of sessions start exactly on a quarter-hour—an unusually regular pattern for natural browser telemetry.
"""

    artifact = {
        "surface": "report",
        "manifest": {
            "version": 1,
            "surface": "report",
            "title": title,
            "description": "Answer-first analysis of session outcomes, intention, activity signals, baselines, and data quality.",
            "generatedAt": summary["source"]["generated_at"],
            "cards": [
                {
                    "id": "sessions_card",
                    "description": "Complete labeled session rows in the provided exports.",
                    "dataset": "overview",
                    "sourceId": "aggregate_analysis",
                    "metrics": [{"label": "Labeled sessions", "field": "sessions", "format": "number"}],
                },
                {
                    "id": "participants_card",
                    "description": "Anonymous participant codes represented in the exports.",
                    "dataset": "overview",
                    "sourceId": "aggregate_analysis",
                    "metrics": [{"label": "Participants", "field": "participants", "format": "number"}],
                },
                {
                    "id": "drift_card",
                    "description": "Share of sessions labeled drift by the post-session binary reflection.",
                    "dataset": "overview",
                    "sourceId": "aggregate_analysis",
                    "metrics": [
                        {"label": "Self-reported drift", "field": "drift_rate", "format": "percent"},
                        {"label": "95% CI lower", "field": "drift_ci_lower", "format": "percent"},
                        {"label": "95% CI upper", "field": "drift_ci_upper", "format": "percent"},
                    ],
                },
            ],
            "charts": [
                {
                    "id": "intention_chart",
                    "title": "Self-reported drift rate by declared intention",
                    "subtitle": "Participant coverage is 18 for every category except accidental openings (14 participants).",
                    "type": "bar",
                    "dataset": "intentions",
                    "sourceId": "aggregate_analysis",
                    "valueFormat": "percent",
                    "encodings": {
                        "x": {"field": "intention", "type": "nominal", "label": "Declared intention"},
                        "y": {"field": "drift_rate", "type": "quantitative", "label": "Self-reported drift rate"},
                        "tooltip": [
                            {"field": "sessions", "type": "quantitative", "label": "Sessions"},
                            {"field": "participant_coverage", "type": "quantitative", "label": "Participants"},
                            {"field": "ci_lower", "type": "quantitative", "label": "95% CI lower", "format": "percent"},
                            {"field": "ci_upper", "type": "quantitative", "label": "95% CI upper", "format": "percent"},
                        ],
                    },
                },
                {
                    "id": "model_chart",
                    "title": "Participant-held-out ROC-AUC by model family",
                    "subtitle": "Six group folds; each fold holds out three participants. Values use full-session aggregates.",
                    "type": "bar",
                    "dataset": "models",
                    "sourceId": "aggregate_analysis",
                    "valueFormat": "number",
                    "encodings": {
                        "x": {"field": "model", "type": "nominal", "label": "Model family"},
                        "y": {"field": "roc_auc", "type": "quantitative", "label": "ROC-AUC"},
                        "tooltip": [
                            {"field": "f1", "type": "quantitative", "label": "F1"},
                            {"field": "accuracy", "type": "quantitative", "label": "Accuracy"},
                            {"field": "auc_ci_lower", "type": "quantitative", "label": "95% CI lower"},
                            {"field": "auc_ci_upper", "type": "quantitative", "label": "95% CI upper"},
                        ],
                    },
                },
                {
                    "id": "overrun_chart",
                    "title": "Self-reported drift rate by intended-time overrun",
                    "subtitle": "The final band contains only 10 sessions and should not be treated as a stable reversal.",
                    "type": "bar",
                    "dataset": "overrun_bands",
                    "sourceId": "aggregate_analysis",
                    "valueFormat": "percent",
                    "encodings": {
                        "x": {"field": "band", "type": "nominal", "label": "Observed duration relative to intention"},
                        "y": {"field": "drift_rate", "type": "quantitative", "label": "Self-reported drift rate"},
                        "tooltip": [{"field": "sessions", "type": "quantitative", "label": "Sessions"}],
                    },
                },
                {
                    "id": "activity_chart",
                    "title": "Median activity difference for drift versus aligned sessions",
                    "subtitle": "Relative difference in medians; positive values are higher in self-reported drift sessions.",
                    "type": "bar",
                    "dataset": "activity",
                    "sourceId": "aggregate_analysis",
                    "valueFormat": "percent",
                    "encodings": {
                        "x": {"field": "signal", "type": "nominal", "label": "Signal"},
                        "y": {"field": "relative_difference", "type": "quantitative", "label": "Relative median difference"},
                        "tooltip": [
                            {"field": "aligned_median", "type": "quantitative", "label": "Aligned median"},
                            {"field": "drift_median", "type": "quantitative", "label": "Drift median"},
                            {"field": "unit", "type": "nominal", "label": "Unit"},
                        ],
                    },
                },
                {
                    "id": "daily_chart",
                    "title": "Daily self-reported drift rate",
                    "subtitle": "July 19–31, 2026; daily denominators range from 39 to 58 sessions.",
                    "type": "line",
                    "dataset": "daily",
                    "sourceId": "aggregate_analysis",
                    "valueFormat": "percent",
                    "encodings": {
                        "x": {"field": "date", "type": "temporal", "label": "Date"},
                        "y": {"field": "drift_rate", "type": "quantitative", "label": "Self-reported drift rate"},
                        "tooltip": [{"field": "sessions", "type": "quantitative", "label": "Sessions"}],
                    },
                },
            ],
            "tables": [
                {
                    "id": "youtube_table",
                    "title": "YouTube sessions by declared intention",
                    "subtitle": "Exact counts and self-reported outcomes for the most frequently observed domain.",
                    "dataset": "youtube_intentions",
                    "sourceId": "aggregate_analysis",
                    "defaultSort": {"field": "sessions", "direction": "desc"},
                    "columns": [
                        {"field": "intention", "label": "Declared intention", "type": "text"},
                        {"field": "sessions", "label": "Sessions", "format": "number"},
                        {"field": "drift_rate", "label": "Self-reported drift", "format": "percent"},
                    ],
                },
                {
                    "id": "model_table",
                    "title": "Exploratory model metrics",
                    "subtitle": "Thresholds are selected in each training fold for F1; ROC-AUC is threshold-independent.",
                    "dataset": "models",
                    "sourceId": "aggregate_analysis",
                    "defaultSort": {"field": "roc_auc", "direction": "desc"},
                    "columns": [
                        {"field": "model", "label": "Model", "type": "text"},
                        {"field": "roc_auc", "label": "ROC-AUC", "format": "number"},
                        {"field": "accuracy", "label": "Accuracy", "format": "percent"},
                        {"field": "precision", "label": "Precision", "format": "percent"},
                        {"field": "recall", "label": "Recall", "format": "percent"},
                        {"field": "f1", "label": "F1", "format": "number"},
                    ],
                },
                {
                    "id": "quality_table",
                    "title": "Data-quality checks",
                    "subtitle": "Structural validity is high; provenance and naturalness require confirmation.",
                    "dataset": "quality_checks",
                    "sourceId": "aggregate_analysis",
                    "defaultSort": {"field": "status", "direction": "desc"},
                    "columns": [
                        {"field": "check", "label": "Check", "type": "text"},
                        {"field": "status", "label": "Status", "type": "text"},
                        {"field": "evidence", "label": "Evidence", "type": "text"},
                    ],
                },
            ],
            "sources": canonical_sources,
            "blocks": [
                {"id": "title", "type": "markdown", "body": f"# {title}"},
                {"id": "executive_summary", "type": "markdown", "body": executive_summary, "sourceId": "aggregate_analysis"},
                {"id": "overview_metrics", "type": "metric-strip", "cardIds": ["sessions_card", "participants_card", "drift_card"]},
                {
                    "id": "definitions",
                    "type": "markdown",
                    "body": "## What these numbers mean\n\nA **session** is one completed row in the supplied 13-column export. **Drift** means the participant selected the binary post-session response mapped to `drift_label = 1`; it is not a direct measure of attention, emotion, diagnosis, or productivity. All activity features are aggregate counts or durations for the complete session.",
                },
                {
                    "id": "intention_finding",
                    "type": "markdown",
                    "body": f"## Intention separates sessions more clearly than domain\n\n**Accidental openings and open-ended browsing are the highest-risk contexts in this dataset.** Accidental openings are labeled drift in {pct(next(item['drift_rate'] for item in summary['intentions'] if item['intention'] == 'accidental_open'))} of 30 sessions, while open-ended browsing is {pct(next(item['drift_rate'] for item in summary['intentions'] if item['intention'] == 'open_ended_browsing'))} across 87 sessions. By comparison, work/study, learning/tutorial, specific-information, and planned-break sessions cluster near 31–33%. The open-ended-versus-task-directed gap is {pp(contrasts['open_ended_minus_task_directed']['difference'])}, with a participant-bootstrap 95% interval that remains above zero. This supports the project’s intention-aware framing without implying that any intention determines an outcome.",
                    "sourceId": "aggregate_analysis",
                },
                {"id": "intention_visual", "type": "chart", "chartId": "intention_chart"},
                {
                    "id": "domain_finding",
                    "type": "markdown",
                    "body": "## The same domain can contain aligned and drift sessions\n\n**YouTube illustrates why domain blocking is too coarse.** Learning/tutorial sessions on YouTube show 25.0% self-reported drift (6 of 24), open-ended browsing shows 63.6% (14 of 22), and planned entertainment/break shows 29.7% (11 of 37). Small cells should not be overread, but the within-domain spread is consistent with the weak participant-held-out domain baseline. The implication is narrow: domain adds context, while declared purpose changes how the same destination should be interpreted.",
                    "sourceId": "aggregate_analysis",
                },
                {"id": "youtube_evidence", "type": "table", "tableId": "youtube_table"},
                {
                    "id": "model_finding",
                    "type": "markdown",
                    "body": f"## Combined signals improve ranking, but not enough for deployment claims\n\n**The combined exploratory model ranks held-out participants’ sessions better than the required alternatives.** Its ROC-AUC is {models['combined']['roc_auc']:.3f}, compared with {models['intention']['roc_auc']:.3f} for intention-only, {models['activity']['roc_auc']:.3f} for activity-only, {models['time_threshold']['roc_auc']:.3f} for the time threshold, and {models['domain']['roc_auc']:.3f} for domain. Participant-bootstrap contrasts put the combined-minus-intention gain at {models['roc_auc_contrasts']['combined_minus_intention']['difference']:.3f} (95% interval {models['roc_auc_contrasts']['combined_minus_intention']['ci_95_participant_bootstrap'][0]:.3f}–{models['roc_auc_contrasts']['combined_minus_intention']['ci_95_participant_bootstrap'][1]:.3f}). The direction supports further study, but ROC-AUC {models['combined']['roc_auc']:.3f} is modest and the thresholds produce many false positives. Do not call this a validated drift detector.",
                    "sourceId": "aggregate_analysis",
                },
                {"id": "model_visual", "type": "chart", "chartId": "model_chart"},
                {"id": "model_exact", "type": "table", "tableId": "model_table"},
                {
                    "id": "time_activity_finding",
                    "type": "markdown",
                    "body": "## Time alone is insufficient; activity differences are directional, not definitive\n\n**Self-reported drift generally rises as sessions run 1.5–3 times longer than intended, but the pattern is not monotonic.** Drift is 36.7% at or below the intended duration, 45.5% at 1.5–2.0×, and 52.8% at 2.0–3.0×; the >3× band falls to 20.0% but contains only 10 sessions. Activity-rate medians show 19.0% more focus losses per minute and 12.0% more scrolling per minute in drift sessions, while drift sessions are 12.2% shorter at the median. These mixed directions explain why simple rules are brittle and why lightweight signals should be modeled together rather than interpreted individually.",
                    "sourceId": "aggregate_analysis",
                },
                {"id": "overrun_visual", "type": "chart", "chartId": "overrun_chart"},
                {"id": "activity_visual", "type": "chart", "chartId": "activity_chart"},
                {
                    "id": "chronology_finding",
                    "type": "markdown",
                    "body": f"## Later sessions have a higher drift rate in this dataset\n\n**The second chronological half of each participant’s sessions is {pp(chronology['difference'])} higher than the first half** ({pct(chronology['first_half_drift_rate'])} versus {pct(chronology['second_half_drift_rate'])}); the participant-bootstrap 95% interval is {pp(chronology['difference_ci_95_participant_bootstrap'][0])} to {pp(chronology['difference_ci_95_participant_bootstrap'][1])}. The daily series is volatile rather than smoothly increasing, so this could reflect changing session mix, repeated-reflection effects, constructed data patterns, or participant behavior. It is a temporal validation question, not evidence of causality.",
                    "sourceId": "aggregate_analysis",
                },
                {"id": "daily_visual", "type": "chart", "chartId": "daily_chart"},
                {
                    "id": "quality_finding",
                    "type": "markdown",
                    "body": f"## Structural quality is high, but provenance is the gating issue\n\n**The files pass the documented structural checks:** all schemas match, no cells are missing, session IDs are unique, participant filenames agree, numeric ranges are valid, and no participant sessions overlap. **Naturalness is the concern:** every row has a binary reflection and {pct(quality['quarter_hour_start_share'])} of starts land exactly on a quarter-hour. Those patterns are plausible for generated fixtures or a curated schedule but unusual for unconstrained in-the-wild telemetry. Until provenance is confirmed, the safest use is pipeline and analysis validation—not empirical claims in the paper.",
                    "sourceId": "aggregate_analysis",
                },
                {"id": "quality_evidence", "type": "table", "tableId": "quality_table"},
                {
                    "id": "next_steps",
                    "type": "markdown",
                    "body": "## Recommended next steps\n\n1. **Confirm provenance in writing.** Mark the files as synthetic, pilot, curated, or real participant exports; do not mix categories in one empirical result.\n2. **Add activity-window exports.** Final session totals cannot support the required 1-, 3-, and 5-minute evaluation.\n3. **Freeze the preprocessing and split plan.** Keep participant-held-out results separate from known-participant chronological results, and retain all required baselines.\n4. **Calibrate thresholds only after model selection.** The exploratory F1 thresholds favor recall and create many false positives; threshold choice must reflect the intended reflective intervention cost.\n5. **Investigate the later-half increase.** Check intention mix, participant composition, reflection behavior, and collection procedures before treating it as behavioral change."
                },
                {
                    "id": "further_questions",
                    "type": "markdown",
                    "body": "## Further questions\n\n- Are these sessions synthetic fixtures, scheduled pilot data, or consented field exports?\n- Where are the per-minute activity-window records needed for early prediction?\n- Was full binary label completion enforced by construction, or were unlabeled/non-binary sessions excluded before this folder was created?\n- What collection or study event changed between participants’ first and second chronological halves?"
                },
                {
                    "id": "caveats",
                    "type": "markdown",
                    "body": "## Caveats and assumptions\n\n- Results describe 633 supplied, fully labeled sessions from 18 anonymous participant codes collected from July 19–31, 2026 (UTC+06:00).\n- The label is a post-session self-report of intention mismatch; it is not true attention, addiction, ADHD, mental health, or emotion detection.\n- Model metrics are exploratory, use final session aggregates, and are not early-prediction or intervention-effect estimates.\n- Observational associations do not establish causality. Domain and intention cells with small counts are unstable.\n- Participant-bootstrap intervals reflect clustering in this dataset; they do not repair uncertain provenance or selection bias.",
                    "sourceId": "aggregate_analysis",
                },
            ],
        },
        "snapshot": {
            "version": 1,
            "generatedAt": summary["source"]["generated_at"],
            "status": "ready",
            "datasets": {
                "overview": [
                    {
                        "sessions": summary["source"]["session_count"],
                        "participants": summary["source"]["participant_count"],
                        "drift_rate": outcome["drift_rate"],
                        "drift_ci_lower": outcome["drift_rate_ci_95_participant_bootstrap"][0],
                        "drift_ci_upper": outcome["drift_rate_ci_95_participant_bootstrap"][1],
                    }
                ],
                "intentions": intention_dataset,
                "models": model_dataset,
                "overrun_bands": summary["overrun_bands"],
                "activity": activity_dataset,
                "daily": chronology["daily"],
                "youtube_intentions": summary["youtube_by_intention"],
                "quality_checks": quality_dataset,
            },
            "accessIssues": [],
        },
        "sources": canonical_sources,
        "package_info": {"controls": {"edit": False, "refresh": False}},
    }

    notes = {
        "audience": "product stakeholders",
        "delivery_mode": "html",
        "required_structure_mapping": {
            "Title": "title",
            "Executive summary": "executive_summary",
            "Key findings with visual evidence": [
                "intention_finding",
                "domain_finding",
                "model_finding",
                "time_activity_finding",
                "chronology_finding",
                "quality_finding",
            ],
            "Recommended next steps": "next_steps",
            "Further questions": "further_questions",
            "Caveats and assumptions": "caveats",
        },
        "chart_map": [
            {"section": "intention_finding", "question": "How does drift vary by declared intention?", "family": "Comparison & Ranking", "type": "bar", "fields": ["intention", "drift_rate", "sessions", "participant_coverage"], "claim": "Accidental and open-ended intentions have the highest drift rates."},
            {"section": "model_finding", "question": "Which feature family ranks held-out sessions best?", "family": "Comparison & Ranking", "type": "bar", "fields": ["model", "roc_auc", "auc_ci_lower", "auc_ci_upper"], "claim": "Combined intention and activity has the highest exploratory AUC."},
            {"section": "time_activity_finding", "question": "Does duration overrun map monotonically to drift?", "family": "Comparison", "type": "bar", "fields": ["band", "drift_rate", "sessions"], "claim": "Time overrun is associated but not sufficient as a label."},
            {"section": "time_activity_finding", "question": "Which activity medians differ by outcome?", "family": "Comparison", "type": "bar", "fields": ["signal", "relative_difference"], "claim": "Activity differences are mixed and individually weak."},
            {"section": "chronology_finding", "question": "How does drift vary across collection dates?", "family": "Trend", "type": "line", "fields": ["date", "drift_rate", "sessions"], "claim": "Daily rates are volatile and later sessions are higher overall."},
        ],
        "palette_policy": "single-root preferred for each chart; neutral reference styling; color is not used as the sole semantic channel",
        "omissions": {
            "early_prediction": "No activity-window records were supplied.",
            "intervention_effect": "No randomized intervention log was supplied.",
            "causal_language": "Observational data cannot establish causality.",
        },
        "privacy": "Only aggregate datasets are embedded in the report; no participant IDs or row-level sessions are exposed.",
    }

    ARTIFACT_PATH.write_text(json.dumps(artifact, indent=2), encoding="utf-8")
    NOTES_PATH.write_text(json.dumps(notes, indent=2), encoding="utf-8")
    print(f"Wrote {ARTIFACT_PATH}")
    print(f"Wrote {NOTES_PATH}")


if __name__ == "__main__":
    main()
