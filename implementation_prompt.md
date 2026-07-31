# DriftSense Phase 2 Implementation Prompt

Continue the existing DriftSense Chrome Manifest V3 extension and Python ML
pipeline. Do not rebuild the collector from scratch. The Phase 1 extension
already collects real intention-labeled sessions and exports participant CSV and
activity-window files.

## Goal

Implement the minimum additional functionality required for a seven-day
micro-randomized model-assisted intervention after a 10-day collection phase.

The intervention must answer:

> Among sessions classified as elevated risk after three minutes, does a brief
> reflective prompt reduce subsequent self-reported drift compared with a
> randomized silent control?

## Required Workflow

1. Train a simple intention-plus-activity logistic-regression model from private,
   consented Phase 1 extension exports.
2. Compare it against time, domain, intention-only, and activity-only baselines.
3. Freeze the three-minute preprocessing, coefficients, intercept, threshold,
   model version, 0.5 assignment probability, and daily prompt cap.
4. Package the model with the extension and run inference locally.
5. For elevated-risk eligible sessions, persist a 1:1 random assignment before
   showing any interface.
6. Show the prompt only for `reflective_prompt`; render nothing for
   `silent_control`.
7. Ask the identical post-session reflection under both assignments.
8. Export a separate allowlisted intervention log.

## Prompt

Display only:

> Still here for your original reason?

Actions:

- Continue intentionally
- Finish now

Do not display a probability, call the session drift, shame the participant, or
block access. Show at most once per session and at most three times per day.

## Eligibility

Evaluate at exactly 180 seconds. A session is randomization-eligible only if it:

- is still active;
- has a declared intention;
- contains every required frozen feature;
- meets the frozen risk threshold; and
- has not reached the daily displayed-prompt cap.

Use `crypto.getRandomValues()` or another browser cryptographic random source.
Persist assignment so service-worker suspension, tab changes, or reloads cannot
rerandomize a session.

## Intervention Export

Create a separate CSV with:

```text
session_id
participant_id
model_version
prediction_offset_seconds
risk_probability
risk_threshold
eligible
randomized_assignment
prompt_shown
prompt_response
suppression_reason
assigned_at
```

Keep the existing 13-column participant CSV unchanged.

## ML Requirements

Use Phase 1 days 1-7 for development and days 8-10 as chronological holdout.
Use participant-grouped validation within development data. Report unseen-user
performance separately when possible.

Required comparisons:

1. time threshold;
2. training-derived domain rule;
3. intention-only logistic regression;
4. activity-only logistic regression; and
5. intention-plus-activity logistic regression.

Random Forest is optional offline analysis. Do not implement a deep sequence
model for this pilot.

Report accuracy, precision, recall, F1, ROC-AUC, confusion matrices, and one-,
three-, and five-minute performance. Construct every early feature only from
information available by its cutoff.

Export a versioned model JSON and shared prediction vectors. Python and
TypeScript predictions must match within a documented numeric tolerance.

## Privacy Rules

Never collect page text, titles, full URLs, query strings, passwords,
screenshots, private messages, source code, keystroke values, full history,
webcam data, identity, emotion, or inferred mental state. Model inference and
randomization remain local. Real participant files stay outside the repository.

## Required Tests

- Three-minute features exclude post-cutoff activity and final duration.
- TypeScript prediction matches Python reference vectors.
- Invalid or mismatched model artifacts fail closed.
- Prediction happens once at 180 seconds.
- Only eligible elevated-risk sessions are randomized.
- Assignment is persisted before UI rendering.
- Silent control renders nothing.
- Prompt assignment renders exactly once.
- Daily prompt cap and suppression reasons work.
- Both assignments use the same post-session question.
- Export privacy allowlist rejects unexpected fields.
- Existing collection, export, and privacy tests remain green.
- Production extension build passes.

## Definition of Done

The Phase 2 implementation is complete when local prediction, eligibility,
randomization, prompt display, persistent assignment, caps, and intervention
export work end-to-end; Python and TypeScript predictions match; documentation
describes the frozen model and schemas; the production extension builds; and no
prohibited data is collected.
