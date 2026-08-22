# DriftSense Revised Implementation Plan

## Objective

Build the smallest privacy-preserving system needed to:

1. run a technical and usability pilot of user-initiated browser task sessions;
2. collect approximately 700 Phase 1 sessions to obtain about 600 usable binary-labeled sessions from 19--25 participants over 10--14 days;
3. compare leakage-safe early-prediction models at 3, 5, and 10 minutes and freeze one deployment policy;
4. run a seven- to ten-day Phase 2 micro-randomized intervention targeting 150--200 eligible sessions where feasible; and
5. evaluate predictive enrichment and the short-term effect of one model-triggered reflective prompt without overclaiming.

The current extension implements an earlier monitored-domain collector. It must be revised before new participant collection. In particular, task initiation, task types, real session boundaries, outcome/action separation, participant-relative features, 3/5/10-minute snapshots, and Phase 2 inference are not complete.

The old dataset is out of scope for model development and empirical claims. New consented exports must remain outside the repository and Git history.

## Research Structure

### Stage 0: Technical and Usability Pilot

Use a small set of non-study testers or explicitly designated pilot participants to verify the end-to-end flow. Do not silently combine pilot records with the main study.

### Stage 1: Phase 1 Observation

Collect task declarations, activity windows, checkpoint features, and post-session labels. Show no model-assisted mid-session prompt.

### Stage 2: Model Development and Freeze

Train and evaluate baselines and simple tabular models. Freeze one model, checkpoint policy, preprocessing specification, threshold, and prompt cap before Phase 2.

### Stage 3: Phase 2 Randomized Intervention

For sessions that satisfy the frozen model's eligibility rule, randomize 1:1 to a reflective side prompt or silent control. Both arms receive the same post-session outcome question.

### Stage 4: Final Analysis

Report prediction and randomized intervention results separately. Do not interpret the overall Phase 1--Phase 2 change as causal.

## Construct and Privacy Boundaries

DriftSense predicts later **participant-reported goal deviation during a declared browser task session**. It does not detect attention, semantic relevance, objective productivity, addiction, emotion, or mental health.

Use `task site` or `participant-approved task site`, not `productive website`. A domain is context only. Leaving a task site, tab switching, scrolling, idling, or playing video may be necessary for the task and must never generate the label directly.

Collect only:

- anonymous participant ID;
- participant-approved task-site hostname;
- structured task type and intended duration;
- session timing and checkpoint offsets;
- aggregate click, scroll, and keyboard-activity counts without key values;
- idle time, active time, focus loss, and tab-switch counts;
- aggregate time outside the approved task-site set without storing the destination;
- accessible video-playing state;
- 10-second activity windows;
- post-session alignment answer; and
- local model and randomization audit fields during Phase 2.

Never collect page text, titles, paths, query strings, passwords, screenshots, messages, source code, free-text task descriptions by default, keystroke values, full browsing history, destination sites outside the approved set, webcam data, identity, emotion, or inferred mental state.

## Revised Participant Experience

### Onboarding

- Explain the construct as alignment with a self-declared browser task.
- Let participants choose sites they use for planned tasks, including mixed-use sites.
- Request Chrome host permission only for chosen task sites.
- Explain that a hostname is context and is not classified as productive or distracting.

### Starting a Task Session

A task session must be user initiated or explicitly confirmed. Collect one structured task type:

- `writing_or_creating`
- `coding_or_problem_solving`
- `reading_or_research`
- `learning_or_tutorial`
- `communication_or_coordination`
- `other_planned_task`

Collect an intended duration using compact presets such as 5, 10, 20, and 30 minutes plus a bounded custom value. Do not use intended duration as the automatic session-ending boundary.

### During the Session

- Store content-free activity windows.
- Create cumulative and recent-window features at 3, 5, and 10 minutes.
- Continue across approved task sites where the protocol defines one task session.
- When the user is outside the approved task-site set, store only aggregate away state/time.
- Do not show model-assisted prompts during Phase 1.

### Session Boundary and Reflection

A session ends through explicit participant completion or a prespecified, tested boundary such as confirmed abandonment or sustained inactivity. Closing or navigating away must create a recoverable pending reflection rather than silently losing the label.

Ask:

> Did this session remain aligned with the task you started?

Map responses as follows:

- `aligned` -> `0`
- `moved_away` -> `1`
- `not_sure` or missing -> null

Keep this outcome separate from subsequent actions such as continue, finish, remind later, or dismiss.

## Phase 1 Data Targets

- Recruit 19--25 adult Chrome/Chromium users.
- Collect for 10--14 days.
- Aim for approximately 700 recorded sessions and about 600 usable binary-labeled sessions after exclusions.
- Aim for at least 20 usable sessions per retained participant and preferably 30--40.
- Report participants, labels, missing windows, and cutoff coverage rather than treating sessions as independent people.

These are feasibility targets, not a formal power calculation. Six hundred sessions support a modest population logistic model but not a reliable separate model for every participant.

## Export and Schema Revision

Keep three allowlisted exports joined by `session_id`: session CSV, activity-window CSV, and Phase 2 intervention CSV.

The revised session schema must include at least:

```text
session_id
participant_id
start_time
end_time
task_type
intended_duration_minutes
task_site_count
duration_seconds
click_count
scroll_count
keyboard_activity_count
idle_seconds
active_seconds
focus_loss_count
tab_switch_count
outside_task_set_seconds
video_playing_seconds
post_session_answer
drift_label
status
```

Hostname context may remain in a separate allowlisted session-site table if a task spans multiple approved sites. Do not encode or export destinations outside the approved task-site set.

Activity windows must include the parent session, offset, duration, aggregate event counts, idle/focus state, outside-task-set state, and accessible video state. Final-session fields must never be used at an earlier cutoff.

## Model Pipeline

### Preprocessing and Features

Implement reproducible preprocessing that:

1. validates exact schemas and types;
2. rejects duplicate session IDs and invalid overlap;
3. reports missing, uncertain, and non-binary labels;
4. joins activity windows by `session_id`;
5. creates 3-, 5-, and 10-minute features;
6. computes cumulative and recent-window rates;
7. prevents post-cutoff values from entering early features;
8. fits encoders and scalers on training data only;
9. computes participant history from prior sessions only; and
10. saves feature order and preprocessing parameters.

Candidate features include task type, intended duration, elapsed-to-intended-duration ratio, approved task-site context, cumulative and recent activity counts/rates, away-time share, and differences or ratios relative to the participant's previous aligned sessions for the same or similar task type.

Use `participant-calibrated` for participant-relative features. Do not claim a separately trained personalized model unless data and validation justify it.

### Required Comparisons

1. majority-class baseline;
2. fixed elapsed-time threshold;
3. intended-duration or elapsed-to-intended-duration baseline;
4. task-site/domain baseline;
5. task-type-only logistic regression;
6. activity-only logistic regression;
7. task-type plus activity logistic regression;
8. task-type plus participant-relative activity logistic regression; and
9. optional Random Forest.

CatBoost or XGBoost may be secondary offline checks. Do not build a GRU, TCN, Transformer, or high-capacity per-person model for this pilot.

### Validation

- Use participant-grouped folds during development.
- Reserve later Phase 1 sessions as a chronological known-participant holdout.
- Report participant-held-out performance separately as unseen-user evaluation.
- Fit all preprocessing and participant histories without future-session leakage.
- Report accuracy, precision, recall, F1, ROC-AUC, confusion matrix, and calibration where feasible.
- At 3, 5, and 10 minutes, report usable sessions, binary labels, class balance, and expected prompt rate.
- Report results on each cutoff-specific eligible set and on the common subset reaching 10 minutes.
- Use participant-resampled confidence intervals where feasible.

### Model Go/No-Go and Freeze

The preferred deployment candidate is logistic regression with task context, activity, and participant-relative features. Selection must consider discrimination, calibration, cutoff coverage, false-prompt burden, and implementation simplicity.

Freeze one policy before Phase 2:

- preferably one selected checkpoint at 3, 5, or 10 minutes; or
- if justified in advance, first threshold crossing across those checkpoints, with at most one prompt per session.

If enrichment over simpler baselines is negligible or eligibility is impractical, report that honestly. Phase 2 may be limited to technical feasibility, but the paper must not claim successful prediction.

### Frozen Model Artifact

```json
{
  "model_version": "...",
  "checkpoint_policy": "single_300_seconds",
  "prediction_offsets_seconds": [180, 300, 600],
  "feature_order": [],
  "numeric_preprocessing": {},
  "categorical_encoding": {},
  "participant_calibration": {},
  "coefficients": [],
  "intercept": 0,
  "risk_threshold": 0,
  "prompt_probability": 0.5,
  "daily_prompt_cap": 3
}
```

Only fields required by the frozen policy need to be populated. Validate Python and TypeScript probabilities against shared test vectors within a documented tolerance.

## Phase 2 Extension

### Local Inference and Eligibility

- Load the packaged frozen model locally.
- Evaluate only at the frozen checkpoint or checkpoints.
- Refuse prediction when required features or model metadata are invalid.
- Store model version, prediction offset, probability, threshold, and eligibility.
- Never send features to a server.
- Treat probability as an audit estimate, not proof of drift.

A session is randomization-eligible only when it remains active at the frozen checkpoint, has a declared task type and complete leakage-safe features, meets the frozen threshold, has not already been randomized, and is not suppressed by the daily cap.

### Randomization and Prompt

For every eligible session:

1. assign `reflective_prompt` or `silent_control` with probability 0.5;
2. persist assignment before rendering;
3. show UI only for `reflective_prompt`;
4. never rerandomize after reload, service-worker suspension, or focus changes; and
5. ask the identical post-session outcome question in both assignments.

Use a browser cryptographic random source rather than `Math.random()`.

Use a compact, nonblocking right-side card:

> Still working toward your original goal?

Actions may include `Continue with my goal`, `Finish the session`, `Remind me later`, and `Dismiss`. Do not display probability, risk language, shame, or a claim that drift occurred. Show at most one prompt per session and apply the frozen daily cap.

### Intervention Log

```text
session_id
participant_id
model_version
checkpoint_policy
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

## Phase 2 Target and Interpretation

Run Phase 2 for seven to ten days and target 150--200 randomized eligible sessions where feasible, with most participants represented in both assignments. This target is preliminary and clustered by participant; it does not equal 150--200 independent participants.

The randomized comparison estimates the effect of showing the prompt among model-eligible sessions. It does not directly compare model targeting with a fixed-timer prompting policy. Predictive comparisons against timer, duration, domain, and task baselines are performed offline in Phase 1.

## Analysis Outputs

### Prediction

- participant and session flow;
- class and missing-label summary;
- cutoff coverage at 3, 5, and 10 minutes;
- model-comparison table and confusion matrices;
- ROC curves, calibration, and expected prompt rate where feasible;
- chronological known-participant and participant-held-out results; and
- participant-relative feature ablation.

### Intervention

- eligibility and assignment flow;
- assignment-specific missing labels and delivery failures;
- participant-level prompt and silent-control drift proportions;
- paired difference and participant-bootstrap 95% confidence interval;
- prespecified paired test where appropriate;
- duration after assignment and immediate ending;
- prompt response, frequency, suppression, annoyance, and usefulness; and
- exit-survey summary.

Do not treat Phase 1 versus Phase 2 as the causal intervention comparison.

## Acceptance Checks

- Production build and all relevant tests pass.
- Session start is user initiated or explicitly confirmed.
- Intended duration does not automatically define the label boundary.
- Navigation, closing, and inactivity create tested pending-reflection behavior.
- Outcome choices are separate from continue/finish actions.
- No prohibited field reaches storage or export.
- Activity windows and snapshots survive service-worker suspension.
- 3/5/10-minute vectors contain no future data.
- Participant-relative features use prior sessions only.
- Python and TypeScript probabilities match shared vectors.
- Assignment is persisted and never repeated.
- Silent control renders no intervention UI.
- Prompt assignment renders no more than one prompt.
- Daily cap and suppression reasons work.
- Both assignments use the same post-session question.
- All exports use explicit allowlists and documented schemas.

## Documentation Required Before Recruitment

- ethics approval or institutional exemption;
- consent form and participant instructions;
- task-site setup guide and session-boundary definitions;
- data-transfer procedure and privacy checklist;
- data dictionaries for all exports;
- pilot exclusion rule;
- model-development, checkpoint, and threshold plan;
- model card for the frozen model;
- analysis plan; and
- incident procedure for accidental collection or extension failure.

## Build Order

1. Replace the old monitored-visit flow with user-initiated task sessions.
2. Separate final labels from continue/finish actions and implement pending reflection.
3. Revise types, storage, privacy allowlists, exports, schemas, tests, and documentation.
4. Implement task-set/away-state aggregation without destination storage.
5. Implement and test 3/5/10-minute feature snapshots.
6. Run a small technical and usability pilot.
7. Freeze the protocol and collect new Phase 1 data.
8. Implement the reproducible modeling and validation pipeline.
9. Select and freeze one deployment policy and artifact.
10. Implement local inference, randomization, prompt cap, side prompt, and intervention export.
11. Run Phase 2 and execute the prespecified analysis.
12. Update the paper only with verified, consented results.

## Definition of Done

The revised study is ready only when the implemented experience matches the paper and protocol; privacy, boundary, schema, cutoff, and inference tests pass; participant data handling has been rehearsed outside Git; the analysis pipeline runs on isolated fixtures; prediction and intervention claims remain separate; and no claim exceeds evidence from the real revised study.
