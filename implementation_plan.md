# DriftSense Implementation Plan

This plan turns the research roadmap into concrete engineering work. The goal is to build a privacy-preserving Chrome extension and local ML pipeline that support:

1. Passive baseline data collection.
2. Static intention-prompt data collection.
3. Model-assisted reflective check-ins.
4. Local export, preprocessing, model training, and study analysis.

The implementation must stay aligned with the research claim:

> DriftSense studies whether declared intention and lightweight browser activity signals can predict and potentially reduce self-reported browser-session digital drift.

Do not implement features that imply attention detection, addiction detection, mental-health inference, emotion detection, surveillance, webcam monitoring, or productivity scoring.

---

## 1. Target Repository Structure

```text
extension/
  manifest.json
  package.json
  vite.config.ts
  tsconfig.json
  src/
    background/
      serviceWorker.ts
      sessionManager.ts
      conditionScheduler.ts
      storage.ts
      exportService.ts
      modelRunner.ts
    content/
      activityTracker.ts
      promptOverlay.tsx
      contentEntry.tsx
    popup/
      Popup.tsx
      popupEntry.tsx
    options/
      Options.tsx
      optionsEntry.tsx
    dashboard/
      Dashboard.tsx
      dashboardEntry.tsx
    shared/
      constants.ts
      types.ts
      domainUtils.ts
      labelRules.ts
      privacyGuard.ts
  public/
  README.md

ml/
  data/
    synthetic/
      sessions.csv
      activity_windows.csv
    raw/
    processed/
  notebooks/
  src/
    generate_synthetic_data.py
    preprocess.py
    features.py
    train_baselines.py
    train_tabular_models.py
    choose_threshold.py
    evaluate_prediction.py
    analyze_conditions.py
    export_figures.py
  tests/
  requirements.txt
  README.md

data/
  README.md
  schema.md
  synthetic/

paper/
  main.tex
  references.bib
  figures/

docs/
  consent_form.md
  participant_instructions.md
  study_protocol.md
  privacy_checklist.md
```

---

## 2. Core Implementation Principles

- Store data locally first using IndexedDB or `chrome.storage.local`.
- Export only user-controlled CSV/JSON files.
- Track only configured monitored domains.
- Record domains, timing, counts, and labels, not content.
- Never collect page text, screenshots, full browsing history, private messages, source code, passwords, key values, webcam data, face identity, or emotion data.
- Keep the model-assisted condition as a reflective check-in, not blocking.
- Use a conservative threshold to avoid excessive nudges.
- Keep all labels as self-reported labels.

---

## 3. Extension Study Modes

Implement one shared extension with a configurable `study_stage` and `condition`.

### Study Stages

```text
stage_1_training
stage_2_evaluation
```

### Conditions

```text
passive_baseline
static_intention_prompt
model_assisted_prompt
```

### Condition Behavior

| Condition | Pre-session prompt | Activity tracking | Model check-in | Post-session prompt |
|---|---|---|---|---|
| passive_baseline | No | Yes | No | Retrospective drift question |
| static_intention_prompt | Yes | Yes | No | Intention-match question |
| model_assisted_prompt | Yes | Yes | Yes, after 3 min if high risk | Intention-match question |

---

## 4. Extension Feature Plan

### 4.1 Manifest and Build Setup

Deliverables:

- Chrome Manifest V3 extension.
- React + TypeScript + Vite setup.
- Background service worker.
- Content script entry.
- Popup, options page, and dashboard pages.

Acceptance checks:

- `npm install` succeeds.
- `npm run build` succeeds.
- Extension loads unpacked in Chrome.
- No remote code execution or external analytics.

---

### 4.2 Privacy-Safe Domain Monitoring

Build:

- Options page for adding/removing monitored domains.
- Domain category selector:
  - video
  - social
  - news
  - shopping
  - learning
  - work
  - other
- Domain matching utility that stores only hostname/domain, not full URL.
- Default monitored domains can be shown, but users must be able to edit them.

Allowed storage:

```text
domain
domain_category
enabled
created_at
```

Acceptance checks:

- Visiting an unmonitored domain records nothing.
- Visiting a monitored domain creates or resumes a session.
- Export contains domain only, not full URL path or query string.

---

### 4.3 Session Manager

Build a background `sessionManager` that creates and closes sessions.

Session start:

- User opens or focuses a tab whose domain is monitored.
- Existing session resumes if same tab/domain remains active.
- New session starts when the monitored domain changes or a prior session has ended.

Session end:

- Tab closes.
- Domain changes.
- User is inactive beyond a configurable timeout.
- User responds to post-session reflection.
- Optional manual end from popup.

Core session fields:

```text
participant_id
session_id
study_stage
condition
domain
domain_category
declared_intention
start_time
end_time
duration_seconds
click_count
scroll_count
keyboard_activity_count
idle_seconds
active_seconds
tab_focus_loss_count
tab_switch_count
video_playing_seconds
model_drift_probability
model_risk_level
model_reason_cues
model_checkin_shown
model_checkin_response
model_probability_shown_to_user
post_session_answer
drift_label
intended_duration_minutes
actual_duration_seconds
```

Acceptance checks:

- Session IDs are unique.
- Participant ID is local and anonymous.
- Session duration is calculated correctly.
- No full browsing history is stored.

---

### 4.4 Activity Window Tracker

Build a content script that aggregates activity every 5 or 10 seconds.

Allowed signals:

```text
clicks_in_window
scroll_events_in_window
keyboard_activity_in_window
idle_in_window
tab_focused
video_playing
url_domain_only
```

Rules:

- Count keyboard events but never store key values.
- Count scroll events but never store content.
- Detect video playback only as a boolean or seconds count if accessible.
- Send window summaries to the background service worker.

Acceptance checks:

- Keyboard values are never present in logs or exported files.
- Activity windows are linked to session IDs.
- Windows stop recording when the tab is no longer monitored.

---

### 4.5 Prompt Overlay

Implement a lightweight overlay in the content script.

Condition B/C pre-session prompt:

```text
Why are you opening this?
```

Options:

```text
Specific information
Intentional break
Boredom
Avoiding work
Accidental click
```

Optional field:

```text
intended_duration_minutes
```

Condition A post-session prompt:

```text
Did this visit feel intentional, or did it become drift?
```

Options:

```text
Mostly intentional
I drifted
Not sure
```

Condition B/C post-session prompt:

```text
Did this visit match your original intention?
```

Options:

```text
Yes
No, I drifted
Continue intentionally
Save for later
```

Condition C model check-in:

```text
Drift risk looks high for this session.

Estimated drift risk: 76%.

Possible reasons: longer than intended, high scrolling.

Still here for your original reason?
```

Options:

```text
Yes, continue
I drifted, wrap up
Remind me in 5 minutes
Save for later
```

Display rules:

- Show a simple risk level: low, medium, or high.
- Show the exact probability only with estimate wording, for example `Estimated drift risk: 76%`.
- If pilot participants find percentages confusing or stressful, switch the study UI to risk level only and keep the probability in the export.
- Never write "you are distracted" or "you are drifting" as a factual claim.
- Use reason cues only from allowed features:
  - longer than intended
  - high scrolling
  - long idle period
  - many tab switches
  - video playing longer than intended
  - low interaction after opening
- Keep reason cues short and understandable.
- Store whether the probability was shown so the study can compare risk-label-only vs probability-visible behavior if needed.

Acceptance checks:

- Prompt text is neutral and non-shaming.
- The website is not blocked after the prompt.
- User can dismiss or answer according to study design.
- Check-ins are rate-limited.
- Probability/risk text is presented as an estimate, not a diagnosis or attention claim.

---

### 4.6 Condition Scheduler

Build a condition scheduler for Stage 2.

Minimum version:

```text
Day 1-2: passive_baseline
Day 3-4: static_intention_prompt
Day 5-7: model_assisted_prompt
```

Better version:

- Counterbalanced participant schedules.
- Store schedule locally per participant.
- Export condition schedule metadata.

Acceptance checks:

- Current condition is visible in popup/options for debugging.
- Condition changes happen at day boundary.
- Manual override is available for pilot testing.

---

### 4.7 Model-Assisted Check-In

Build the first integrated version as a simple local model runner.

Recommended implementation path:

1. Train the stronger offline model in Python.
2. Select first-3-minute features.
3. Choose a conservative threshold.
4. Export either:
   - a simple logistic regression model to JSON, or
   - a rule-based approximation using the best thresholded features.

The extension computes:

```text
model_drift_probability
model_risk_level
model_reason_cues
model_checkin_shown
model_checkin_response
model_probability_shown_to_user
```

Risk-level mapping:

```text
if probability < 0.40:
    risk_level = "low"
elif probability < threshold:
    risk_level = "medium"
else:
    risk_level = "high"
```

Reason-cue examples:

```text
duration_seconds > intended_duration_seconds -> longer_than_intended
scroll_count_first_3_min is high -> high_scrolling
idle_ratio_first_3_min is high -> long_idle_period
tab_switch_count_first_3_min is high -> many_tab_switches
video_playing_seconds_first_3_min is high -> video_playing
```

Reason cues must be derived from aggregate metadata only. Do not inspect page text, titles, comments, recommendations, messages, or search queries.

Check-in logic:

```text
if condition == "model_assisted_prompt"
and session_duration >= 180 seconds
and model_drift_probability >= threshold
and no check-in was shown recently:
    compute risk_level and reason_cues
    show reflective check-in with risk estimate
```

Acceptance checks:

- Model output is stored as probability, not a diagnosis.
- Check-in appears only in Condition C.
- Check-in is sparse and rate-limited.
- Risk reason cues are explainable and privacy-safe.
- The UI makes clear that the estimate may be wrong.
- If ML integration fails, fallback is disabled instead of collecting extra data.

---

### 4.8 Dashboard and Export

Dashboard should be useful for debugging and participant transparency, not the main research claim.

Show:

- Total monitored-domain sessions.
- Drift vs non-drift sessions.
- Condition counts.
- Intention distribution.
- Mean/median session duration.
- Export buttons.
- Delete-all-data button.

Export files:

```text
sessions.csv
activity_windows.csv
sessions.json
activity_windows.json
```

Acceptance checks:

- Export schema matches `data/schema.md`.
- Delete-all-data clears local extension data.
- Synthetic/manual pilot data can be exported and loaded by ML scripts.

---

## 5. ML Pipeline Plan

### 5.1 Synthetic Dataset

Create a synthetic dataset first so the pipeline can run before real collection.

Files:

```text
ml/data/synthetic/sessions.csv
ml/data/synthetic/activity_windows.csv
```

Acceptance checks:

- Synthetic data includes all three conditions.
- Synthetic data includes drift and non-drift labels.
- Pipeline can run end-to-end without real participant data.

---

### 5.2 Preprocessing

Build `ml/src/preprocess.py`.

Responsibilities:

- Load sessions and activity windows.
- Validate required columns.
- Remove invalid sessions.
- Remove unlabeled sessions for binary prediction.
- Convert label strings to binary labels.
- Separate Stage 1 training data from Stage 2 evaluation data.
- Prefer participant-wise split.

Acceptance checks:

- Script reports row counts before and after cleaning.
- Script fails clearly if prohibited columns appear.
- Output processed files are saved under `ml/data/processed/`.

---

### 5.3 Feature Engineering

Build `ml/src/features.py`.

Feature groups:

```text
time_features
domain_features
intention_features
first_3_min_activity_features
full_session_activity_features
```

First-3-minute features:

- clicks in first 3 minutes
- scrolls in first 3 minutes
- keyboard activity count in first 3 minutes
- idle ratio in first 3 minutes
- active ratio in first 3 minutes
- focus loss count in first 3 minutes
- video playing seconds in first 3 minutes

Full-session features:

- total duration
- total clicks
- total scrolls
- total keyboard activity
- total idle seconds
- active ratio
- video ratio
- tab switch count
- focus loss count

Acceptance checks:

- Feature script can generate both first-3-minute and full-session matrices.
- Feature columns are documented.
- Categorical features are consistently encoded.

---

### 5.4 Prediction Models

Build scripts:

```text
ml/src/train_baselines.py
ml/src/train_tabular_models.py
ml/src/evaluate_prediction.py
```

Required model comparisons:

1. Time-threshold baseline.
2. Domain-category baseline.
3. Intention-only logistic regression.
4. Activity-only Random Forest or XGBoost.
5. Intention + activity Random Forest or XGBoost.

Main extension candidate:

- First-3-minute intention + activity model.
- Prefer simple logistic regression or compact tree/rule export if extension integration is hard.

Metrics:

```text
accuracy
precision
recall
F1-score
ROC-AUC
confusion matrix
```

Acceptance checks:

- Results table is exported as CSV.
- Confusion matrix figure is exported.
- ROC curve figure is exported.
- No result values are invented in paper before real data exists.

---

### 5.5 Threshold Selection

Build `ml/src/choose_threshold.py`.

Purpose:

- Choose Condition C check-in threshold using Stage 1 validation data.
- Prefer fewer false nudges over maximum recall.

Outputs:

```text
model_threshold.json
model_export.json
threshold_report.csv
```

Acceptance checks:

- Threshold is selected only from Stage 1 data.
- Threshold report includes precision, recall, F1, and expected check-in rate.
- Extension can load the exported threshold/config.

---

### 5.6 Condition Analysis

Build `ml/src/analyze_conditions.py`.

Compare:

```text
passive_baseline
static_intention_prompt
model_assisted_prompt
```

Outcomes:

- drift session percentage
- mean session duration
- median session duration
- sessions per participant
- model check-ins shown
- check-in responses
- prompt annoyance
- perceived control
- privacy concern

Acceptance checks:

- Condition comparison table is exported.
- Drift-rate-by-condition figure is exported.
- Analysis reports uncertainty where possible.
- Passive baseline comparison is described cautiously.

---

## 6. Data and Documentation Plan

Create:

```text
data/schema.md
docs/consent_form.md
docs/participant_instructions.md
docs/study_protocol.md
docs/privacy_checklist.md
extension/README.md
ml/README.md
```

Documentation must include:

- What data is collected.
- What data is not collected.
- How to install the extension.
- How to configure monitored domains.
- How to export data.
- How to delete data.
- How to run ML scripts.
- How to reproduce synthetic-data results.

---

## 7. Build Order

### Sprint 1: Foundation

Tasks:

- Create extension scaffold.
- Create shared TypeScript types.
- Implement monitored-domain settings.
- Implement anonymous participant ID.
- Implement local storage wrapper.
- Implement privacy guard for export fields.

Done when:

- Extension builds.
- Domain settings persist.
- Privacy-safe schema is documented.

---

### Sprint 2: Passive Baseline

Tasks:

- Implement session start/end logic.
- Implement activity counting.
- Implement passive post-session reflection.
- Implement CSV/JSON export.

Done when:

- Condition A works end-to-end.
- Export loads in Python.
- No prohibited data appears in export.

---

### Sprint 3: Static Intention Prompt

Tasks:

- Implement pre-session intention prompt.
- Implement intended duration field.
- Implement intention-match post-session prompt.
- Implement label rules.

Done when:

- Condition B works end-to-end.
- Stage 1 training dataset can be collected.
- Labels are correctly mapped.

---

### Sprint 4: ML Baselines and Tabular Model

Tasks:

- Generate synthetic dataset.
- Implement preprocessing.
- Implement feature engineering.
- Train time/domain/intention/activity/intention+activity models.
- Export prediction metrics and figures.

Done when:

- ML pipeline runs on synthetic data.
- Stage 1 real export can be processed.
- First-3-minute model candidate is selected.

---

### Sprint 5: Model-Assisted Condition

Tasks:

- Export model or threshold config.
- Implement local model runner.
- Implement model-assisted check-in.
- Add check-in rate limits.
- Add condition scheduler.

Done when:

- Condition C works in a pilot.
- Check-in is triggered only after first 3 minutes.
- Model probability and check-in response are exported.

---

### Sprint 6: Study Packaging and Analysis

Tasks:

- Add participant instructions.
- Add consent form.
- Add privacy checklist.
- Implement condition analysis script.
- Generate paper-ready tables and figures.
- Update paper placeholders after real results exist.

Done when:

- Extension supports all three conditions.
- ML scripts run on exported data.
- Paper tables and figures can be generated.
- Documentation explains the full workflow.

---

## 8. Testing Checklist

### Extension Tests

- Domain matching stores only domain names.
- Unmonitored domains produce no records.
- Keyboard activity count never stores key values.
- Activity windows stop when tab is inactive or unmonitored.
- Condition A does not show pre-session prompt.
- Condition B shows pre-session prompt and post-session prompt.
- Condition C shows pre-session prompt and conditional model check-in.
- Export schema matches documentation.
- Delete-all-data removes sessions and activity windows.

### ML Tests

- Synthetic data validates against schema.
- Preprocessing rejects prohibited columns.
- Feature generation handles missing optional fields.
- Model scripts run with synthetic data.
- Evaluation exports metrics and figures.
- Condition analysis handles all three conditions.

### Study Readiness Tests

- Pilot with one researcher for 1 day.
- Export/import roundtrip succeeds.
- Condition schedule is correct.
- Prompt burden feels acceptable.
- Privacy checklist passes.

---

## 9. Minimum Viable Implementation

If time becomes tight, keep only:

- monitored-domain settings
- local participant ID
- three study conditions
- session metadata
- activity windows
- pre-session intention prompt
- post-session reflection prompt
- model-assisted check-in using simple exported threshold/model
- CSV/JSON export
- synthetic dataset
- baselines plus one tabular model
- condition comparison analysis

Cut:

- complex dashboard
- deep learning
- cloud sync
- personalization
- LLM-generated nudges
- interviews
- advanced visualizations

---

## 10. Final Implementation Definition of Done

The implementation is complete when:

- Extension builds successfully.
- Extension supports passive, static intention, and model-assisted conditions.
- No prohibited data is collected.
- Data is stored locally and can be deleted.
- Data exports match the documented schema.
- Synthetic dataset works.
- Stage 1 data can train a drift-risk model.
- First-3-minute model or threshold can run in the extension.
- Stage 2 data can compare all three conditions.
- ML scripts produce metrics, tables, and figures.
- README files explain setup, privacy, export, and analysis.
