# DriftSense Implementation Plan

## Objective

Build the smallest privacy-preserving system needed to:

1. collect 10 days of intention-labeled browser sessions from one cohort;
2. train and freeze a simple three-minute drift-risk model;
3. run a seven-day session-level randomized reflective intervention; and
4. evaluate prediction and short-term prompt effects without overclaiming.

The current extension implements Phase 1 collection and participant export. The
next implementation milestone is the model-assisted Phase 2 build.

## Non-Negotiable Privacy Boundary

Collect only:

- anonymous participant ID;
- monitored hostname;
- declared intention and intended duration;
- session timing;
- click, scroll, and keyboard-activity counts without values;
- idle time and focus loss;
- accessible video-playing state;
- 10-second activity windows;
- post-session reflection;
- local model and randomization audit fields during Phase 2.

Never collect page text, page titles, full URLs, query strings, passwords,
screenshots, messages, source code, keystroke values, full browsing history,
webcam data, identity, emotion, or inferred mental state.

## Phase 1 Collector

### Existing Requirements

- Chrome Manifest V3, React, TypeScript, and Vite.
- Consent-led onboarding and anonymous codes such as `P01`.
- Participant code locked after the first stored session.
- Participant-selected monitored domains and explicit host permissions.
- Pre-session intention prompt on monitored sessions.
- Aggregate activity collection and 10-second activity windows.
- Post-session self-report label.
- Local dashboard, pause, deletion, and participant-controlled export.
- Exact 13-column participant CSV plus optional window CSV and JSON audit bundle.

### Phase 1 Acceptance Checks

- The extension builds and all tests pass.
- No prohibited field reaches storage or export.
- The CSV filename matches `participant_id`.
- Missing and non-binary reflections remain unlabeled.
- Activity windows stop when the monitored session loses eligibility.
- The collector contains no participant-facing data-generation control.
- A one-day researcher pilot confirms session boundaries and export usability.

## Model Pipeline

### Input

Use only real consented extension exports stored outside the repository:

- participant CSV files;
- activity-window CSV files; and later
- Phase 2 intervention logs.

`ml/combine_participant_csv.py` validates and combines participant CSV files
without changing the originals.

### Preprocessing

Implement reproducible preprocessing that:

1. validates exact schemas and types;
2. rejects duplicate session IDs and participant-session overlap;
3. reports missing and non-binary labels;
4. joins activity windows by `session_id`;
5. creates one-, three-, and five-minute and full-session features;
6. prevents any post-cutoff value from entering an early feature;
7. fits encoders and scalers on training data only; and
8. saves the complete feature order and preprocessing parameters.

### Models

Required comparison order:

1. time-threshold baseline;
2. training-derived domain baseline;
3. intention-only logistic regression;
4. activity-only logistic regression;
5. intention-plus-activity logistic regression; and
6. optional Random Forest.

CatBoost or XGBoost may be secondary offline analyses. Do not build a TCN, GRU,
or Transformer for this pilot.

### Validation

- Use days 1-7 for development.
- Use participant-grouped folds within development data.
- Evaluate once on the chronological days 8-10 holdout.
- Report participant-held-out performance separately when possible.
- Report accuracy, precision, recall, F1, ROC-AUC, confusion matrix, and early
  performance at one, three, and five minutes.
- Record class distribution and confidence intervals.

### Frozen Model Artifact

Export one versioned JSON artifact containing:

```json
{
  "model_version": "...",
  "prediction_offset_seconds": 180,
  "feature_order": [],
  "numeric_preprocessing": {},
  "categorical_encoding": {},
  "coefficients": [],
  "intercept": 0,
  "risk_threshold": 0,
  "prompt_probability": 0.5,
  "daily_prompt_cap": 3
}
```

Validate the artifact in Python and TypeScript against shared test vectors. The
same feature vector must produce matching probabilities within a documented
tolerance.

## Phase 2 Extension

### Local Inference

- Load the packaged model artifact from the extension bundle.
- At 180 seconds, construct the exact frozen feature vector.
- Refuse prediction if required features or model metadata are invalid.
- Store model version, prediction time, probability, and threshold.
- Never send features to a server.

### Eligibility and Randomization

A session is eligible only when:

- it is still active at 180 seconds;
- the participant declared an intention;
- all required features exist;
- predicted probability meets the frozen threshold; and
- the daily displayed-prompt cap has not been reached.

For each eligible session:

1. assign `reflective_prompt` or `silent_control` with probability 0.5;
2. persist assignment before attempting UI display;
3. show the prompt only for `reflective_prompt`;
4. never rerandomize the session after reload or service-worker suspension; and
5. ask the same post-session reflection under both assignments.

Use a browser cryptographic random source rather than `Math.random()`.

### Reflective Prompt

Text:

> Still here for your original reason?

Actions:

- Continue intentionally
- Finish now

Do not display risk probability, risk language, or a claim that drift occurred.
Do not block the website. Show no more than one prompt per session and three
displayed prompts per participant day.

### Intervention Log

Use a separate allowlisted export keyed by `session_id`:

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

Do not add the intervention fields to the stable 13-column participant CSV.

### Phase 2 Acceptance Checks

- Python and TypeScript probabilities match shared vectors.
- Prediction never runs before 180 seconds.
- Final-session fields never enter the three-minute vector.
- Only elevated-risk eligible sessions are randomized.
- Assignment is approximately balanced over repeated deterministic tests.
- Assignment persists across extension suspension and tab focus changes.
- Silent control renders no intervention UI.
- Prompt assignment renders exactly one prompt.
- Prompt cap and suppression reason work.
- Both assignments use identical post-session questions.
- Intervention export contains only allowlisted fields.
- Production build and privacy tests pass.

## Analysis Implementation

### Prediction Outputs

- dataset and class summary;
- model-comparison table;
- confusion matrix;
- ROC curve;
- one-, three-, and five-minute performance chart;
- same-participant chronological result; and
- participant-held-out result.

### Intervention Outputs

- eligibility and assignment flow counts;
- assignment-specific missing-label rates;
- participant-level prompt and silent-control drift proportions;
- paired difference and Wilcoxon signed-rank result;
- participant-bootstrap 95% confidence interval;
- duration after assignment;
- prompt response and suppression summaries; and
- exit-survey summary.

Do not treat Phase 1 versus Phase 2 as the causal intervention comparison.

## Documentation and Study Materials

Before recruitment, complete:

- consent form;
- participant instructions;
- monitored-domain setup guide;
- data-transfer procedure;
- privacy checklist;
- data dictionary for all three exports;
- model card for the frozen logistic model;
- analysis plan; and
- incident procedure for accidental collection or extension failure.

Real exports must remain outside Git and outside shared folders not approved for
participant data.

## Build Order

1. Stabilize Phase 1 collector and run a one-day researcher pilot.
2. Complete private export intake and time-truncated feature pipeline.
3. Collect Phase 1 data for 10 days.
4. Train, evaluate, select, and freeze the three-minute model.
5. Implement local inference, randomization, prompt cap, and intervention log.
6. Test the Phase 2 build with shared vectors and manual browser scenarios.
7. Run Phase 2 for seven days.
8. Execute the prespecified analysis and update the paper with real results.

## Definition of Done

Implementation is ready for participant use only when:

- ethics requirements and consent materials are complete;
- the collector and intervention builds pass tests and production builds;
- the privacy guard rejects prohibited fields;
- session, window, and intervention schemas are documented;
- local inference matches the Python reference;
- randomization and caps are auditable and stable;
- private export handling has been rehearsed;
- the analysis scripts run on isolated test fixtures without creating a
  repository dataset; and
- the paper states only claims supported by the implemented protocol and real
  results.
