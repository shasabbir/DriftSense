# DriftSense 6-Week Roadmap: Prediction + Drift-Reduction Study

## Final Research Direction

DriftSense will be studied in two linked stages:

1. **Prediction stage:** collect an intention-prompt dataset and train a model to predict self-reported browser-session drift.
2. **UX/intervention stage:** use the trained model inside the extension to trigger lightweight reflective check-ins, then compare whether drift is lower than normal browsing and static intention prompting.

The final paper should be framed carefully:

> DriftSense evaluates whether intention prompts and local drift-risk prediction can reduce **self-reported browser-session drift** compared with passive monitored browsing.

Do **not** claim attention detection, addiction detection, emotion detection, ADHD diagnosis, or mental-health inference.

---

## 1. Final Research Questions

### RQ1: Prediction

Can declared browsing intention and lightweight browser activity signals predict self-reported browser-session drift better than time-on-site and domain-category baselines?

### RQ2: Prompt Effect

Does asking users to declare a browsing intention before a monitored-domain session reduce self-reported drift compared with passive monitored browsing?

### RQ3: Model-Assisted Effect

Does a model-triggered reflective check-in reduce self-reported drift beyond a static intention prompt?

---

## 2. Final Contributions

Keep the paper to four focused contributions:

1. A privacy-preserving Chrome extension that collects lightweight browser-session metadata without content.
2. A browser-session dataset with intention prompts, activity metadata, and post-session self-reported drift labels.
3. A drift prediction model compared against time, domain, intention-only, and activity-only baselines.
4. A three-condition field comparison of passive monitoring, intention prompting, and model-assisted reflective check-ins.

This is stronger than prediction-only, but still simple if the model-assisted check-in is lightweight.

---

## 3. Study Design Overview

Use a **two-stage study**.

### Stage 1: Model Training Dataset

Purpose:

> Collect prompted sessions and train the drift-risk model.

Condition:

- Intention prompt before monitored-domain access.
- Lightweight activity metadata collection.
- Post-session reflection label.
- No model-assisted nudges.

Target:

- 10-15 participants
- 4-5 days
- 250-500 labeled sessions

Output:

- training dataset
- validated preprocessing pipeline
- trained drift-risk model
- selected threshold for model-assisted check-ins

### Stage 2: Three-Condition Evaluation

Purpose:

> Compare normal monitored browsing, static intention prompting, and model-assisted prompting.

Target:

- 20-25 participants
- 7 days
- 400-800 labeled sessions

Conditions:

| Condition | Description | What It Tests |
|---|---|---|
| A. Passive baseline | No pre-session intention prompt. Lightweight tracking only. Post-session retrospective drift question. | Approximate normal monitored browsing. |
| B. Intention prompt | Pre-session intention prompt + post-session reflection. No model nudge. | Whether declaring intention reduces drift. |
| C. Model-assisted prompt | Pre-session intention prompt + local drift-risk prediction + reflective check-in when risk is high. | Whether model-triggered reflection reduces drift beyond static prompting. |

Recommended design:

- Prefer **within-subject counterbalancing** if possible: each participant experiences all three conditions on different days.
- Example 7-day schedule:
  - Day 1-2: Condition A
  - Day 3-4: Condition B
  - Day 5-7: Condition C
- Better version: randomize/counterbalance order across participants to reduce order effects.

If counterbalancing is too hard, use fixed order and clearly report it as a limitation.

---

## 4. Condition Details

### Condition A: Passive Baseline

No pre-session prompt.

The extension:

- tracks configured monitored domains
- records lightweight metadata
- asks only after the session

Post-session question:

> Did this visit feel intentional, or did it become drift?

Options:

- Mostly intentional
- I drifted
- Not sure

Label rule:

- Mostly intentional = non-drift
- I drifted = drift
- Not sure = exclude or analyze separately

Important note:

Condition A does not capture declared intention before browsing. It approximates normal browsing and provides a baseline drift rate. The paper should acknowledge that its label is retrospective and not identical to Conditions B/C.

### Condition B: Static Intention Prompt

Pre-session question:

> Why are you opening this?

Options:

- Specific information
- Intentional break
- Boredom
- Avoiding work
- Accidental click

Post-session question:

> Did this visit match your original intention?

Options:

- Yes
- No, I drifted
- Continue intentionally
- Save for later

Label rule:

- Yes = non-drift
- No, I drifted = drift
- Continue intentionally / Save for later = separate or excluded

### Condition C: Model-Assisted Prompt

Same as Condition B, plus local model prediction.

Flow:

```text
User opens monitored domain
-> declares intention
-> browses normally
-> after 3 minutes, model estimates drift probability
-> if risk exceeds threshold, show reflective check-in
-> post-session reflection label
```

Example model output:

```text
drift_probability = 0.76
risk_level = high
reason_cues = longer_than_intended, high_scrolling
```

Example check-in:

> Drift risk looks high for this session.
>
> Estimated drift risk: 76%.
>
> Possible reasons: longer than intended, high scrolling.
>
> Still here for your original reason?

Options:

- Yes, continue
- I drifted, wrap up
- Remind me in 5 minutes
- Save for later

Rules:

- Do not block the website.
- Do not shame the user.
- Do not claim the system detects attention.
- Present the probability as an estimate, not a fact.
- Show a simple risk label such as low, medium, or high, plus the estimated probability if the pilot shows that users understand it.
- Show reason cues only from privacy-safe features, such as duration, idle time, scrolling, tab switching, or video playback.
- Keep check-ins sparse to avoid annoyance.

Suggested threshold:

- Tune threshold on Stage 1 validation data.
- Prefer a conservative threshold to reduce false nudges.
- Example starting point: show check-in only when drift probability is above 0.70.

---

## 5. Data Collection Rules

Allowed data:

- anonymous participant ID
- session ID
- condition: passive, intention-prompt, model-assisted
- monitored domain
- domain category
- declared intention, for Conditions B/C only
- session start/end time
- duration
- click count
- scroll count
- keyboard activity count without key values
- idle time
- active time
- tab focus changes
- tab switch count
- video playback status if accessible
- model drift probability, Condition C only
- model risk level, Condition C only
- model reason cues, Condition C only
- whether model check-in was shown, Condition C only
- check-in response, Condition C only
- whether drift probability was shown to the user, Condition C only
- post-session reflection answer
- drift label

Forbidden data:

- page text
- passwords
- screenshots
- private messages
- full browsing history
- source code
- keystroke values
- webcam data
- face identity
- emotion data

---

## 6. Dataset Files

### `sessions.csv`

Recommended columns:

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

### `activity_windows.csv`

Recommended columns:

```text
participant_id
session_id
study_stage
condition
timestamp_offset_seconds
clicks_in_window
scroll_events_in_window
keyboard_activity_in_window
idle_in_window
tab_focused
video_playing
url_domain_only
```

---

## 7. Model Plan

Train the prediction model using Stage 1 prompted data.

Compare:

1. Time-threshold baseline
2. Domain-category baseline
3. Intention-only logistic regression
4. Activity-only Random Forest or XGBoost
5. Intention + activity Random Forest or XGBoost

Primary model for extension integration:

- Random Forest or XGBoost
- Use first-3-minute features
- Output drift probability

Avoid deep learning in the main study unless the dataset exceeds 1,000+ labeled sessions.

---

## 8. Evaluation Plan

The evaluation should look familiar to related digital wellbeing and self-control studies, then add the ML layer as the main extension. In other words, first evaluate whether the intervention changes user-reported behavior and experience, then evaluate whether the model helps trigger the intervention at better moments.

Related studies commonly report:

- usage behavior, such as session count, time spent, and app/site openings
- self-reported distraction, regret, usefulness, annoyance, and perceived control
- comparisons between normal use and an intervention condition

DriftSense keeps these standard HCI outcomes, but adds model evaluation and model-assisted timing.

### Prediction Evaluation

This evaluates whether the ML model is good enough to assist the extension.

Report:

- F1-score
- ROC-AUC
- precision
- recall
- accuracy
- confusion matrix
- first-3-minute performance
- expected check-in rate at the selected threshold

Main comparison:

> Does intention + activity outperform time-only and domain-only baselines?

Secondary comparison:

> Does intention + activity outperform activity-only?

Model usability question:

> Does the first-3-minute model identify sessions where a reflective check-in is likely to be useful without creating too many false nudges?

### UX / Drift-Reduction Evaluation

This follows the style of related digital wellbeing field studies.

Compare the three conditions:

| Outcome | Condition A | Condition B | Condition C |
|---|---:|---:|---:|
| Drift session percentage | | | |
| Mean session duration | | | |
| Median session duration | | | |
| Sessions per participant | | | |
| Prompt/check-in annoyance | | | |
| Perceived control | | | |
| Prompt usefulness | | | |
| Privacy concern | | | |

Main UX hypothesis:

> Condition C will have lower self-reported drift than Condition B, and Condition B will have lower self-reported drift than Condition A.

### ML-Assisted Prompt Evaluation

This is the supercharged part beyond typical prompt/friction studies.

For Condition C, report:

- number of model check-ins shown
- percentage of sessions where check-in was shown
- average model drift probability when check-in was shown
- model risk level shown to user: low, medium, high
- most common reason cues shown, such as "longer than intended" or "high scrolling"
- user response to check-in
- drift rate after check-in
- annoyance rating for model-assisted check-ins
- participant feedback on whether the prompt appeared at the right time

Main ML-assistance question:

> Does model-triggered reflection feel more timely and produce lower self-reported drift than always using the same static intention prompt?

Use cautious language:

- "was associated with lower self-reported drift"
- "participants reported fewer drift sessions"
- "model-assisted check-ins may help users reassess intention"
- "the model helped time reflective check-ins"

Avoid:

- "the model prevented distraction"
- "the system detected attention loss"
- "the probability proves the user was drifting"

---

## 9. User Feedback Survey

Use a short survey after Stage 2.

5-point Likert items:

- The intention prompt was useful.
- The model-assisted check-in was useful.
- The prompts made me feel more in control.
- The prompts were annoying.
- The data collection felt acceptable.
- The prompt wording was clear.
- I would use a tool like this again.

Open-ended questions:

- What felt useful?
- What felt annoying?
- Did the model-assisted check-in appear at appropriate times?
- Did the system ever feel too intrusive?
- What should be changed?

Optional:

- 5 short interviews if time allows.

---

## 10. Six-Week Execution Plan

### Week 1: Build Core Extension and Study Materials

Deliverables:

- extension MVP
- monitored-domain settings
- passive condition support
- intention prompt support
- post-session reflection support
- local storage
- CSV export
- delete-all-data button
- consent form
- participant instructions
- data schema

Decision gate:

- Do not recruit until export works and no prohibited data is present.

### Week 2: Stage 1 Training Data Collection

Deliverables:

- 10-15 participants onboarded
- 4-5 days of prompted sessions
- 250-500 labeled sessions target
- preprocessing script
- time baseline
- domain baseline
- intention-only model

Decision gate:

- If fewer than 200 labels are collected, extend Stage 1 or reduce the model to a simpler logistic/Random Forest model.

### Week 3: Train Model and Prepare Model-Assisted Extension

Deliverables:

- activity-only model
- intention + activity model
- selected 3-minute feature set
- selected drift-risk threshold
- local model integration design
- model-assisted check-in implemented
- pilot test of Condition C

Implementation options:

- simplest: export a small logistic model or rule-based model to JSON
- acceptable: use Random Forest/XGBoost server-side only for study simulation if local integration is not ready
- better: run the model locally in the extension using a lightweight JavaScript implementation

Decision gate:

- If local ML integration is too slow, use a simpler model for the check-in and report the stronger model offline.

### Week 4: Stage 2 Three-Condition Field Study

Deliverables:

- 20-25 participants onboarded
- Condition A: passive baseline
- Condition B: static intention prompt
- Condition C: model-assisted prompt
- reminder messages sent
- daily check that exports are working

Recommended schedule:

- 2 days passive baseline
- 2 days intention prompt
- 3 days model-assisted prompt

Better schedule:

- counterbalance condition order across participants

Decision gate:

- If condition switching creates bugs, use fixed order and report it as a limitation.

### Week 5: Clean Data and Evaluate

Deliverables:

- merged dataset
- cleaned labels
- dataset summary table
- model comparison table
- three-condition drift-rate comparison
- first-3-minute vs full-session prediction comparison
- survey responses
- figures:
  - dataset distribution
  - model comparison
  - drift rate by condition
  - confusion matrix
  - ROC curve
  - feature importance

Decision gate:

- If Condition C does not reduce drift, report honestly and focus discussion on model threshold, prompt timing, and prompt burden.

### Week 6: Paper and Final Package

Deliverables:

- full paper draft
- final PDF
- final presentation
- final results tables
- final figures
- code README
- data schema README
- synthetic/sample dataset
- limitations section updated

Paper framing:

- If results are strong: field evaluation of prediction and model-assisted reflection.
- If results are modest: feasibility study of intention-aware browser-session drift prediction and reflective check-ins.

---

## 11. Required Paper Tables

### Table 1: Dataset Summary

| Item | Value |
|---|---:|
| Participants | |
| Study duration | |
| Stage 1 sessions | |
| Stage 2 sessions | |
| Labeled sessions | |
| Drift sessions | |
| Non-drift sessions | |
| Monitored domains | |

### Table 2: Prediction Model Comparison

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---:|---:|---:|---:|---:|
| Time baseline | | | | | |
| Domain baseline | | | | | |
| Intention-only | | | | | |
| Activity-only | | | | | |
| Intention + activity | | | | | |

### Table 3: Three-Condition Comparison

| Condition | Sessions | Drift % | Mean Duration | Annoyance | Perceived Control |
|---|---:|---:|---:|---:|---:|
| Passive baseline | | | | | |
| Intention prompt | | | | | |
| Model-assisted prompt | | | | | |

### Table 4: Model-Assisted Check-In Outcomes

| Outcome | Value |
|---|---:|
| Check-ins shown | |
| Mean drift probability when shown | |
| High-risk check-ins | |
| Most common reason cue | |
| Check-ins accepted | |
| Remind-later responses | |
| Save-for-later responses | |
| Reported annoyance | |
| Reported timing appropriateness | |

---

## 12. Required Figures

Minimum:

1. System architecture
2. Session-labeling and condition flow
3. Modeling pipeline
4. Drift rate by condition
5. Model comparison chart
6. ROC curve
7. Confusion matrix
8. Feature importance

Optional:

- prompt/check-in response distribution
- first-3-minute vs full-session prediction chart

---

## 13. What To Cut If Time Is Short

Cut:

- deep learning
- complex dashboard
- interviews
- personalization
- cross-device tracking
- LLM nudges
- website UI modification
- cloud backend

Keep:

- passive baseline
- intention prompt condition
- model-assisted condition
- post-session labels
- local export
- privacy-safe metadata
- time/domain baselines
- intention + activity model
- drift-rate comparison
- prompt burden survey

---

## 14. Final Definition of Done

The project is complete when:

- extension supports the three conditions
- no prohibited data is collected
- Stage 1 model-training data is collected
- drift-risk model is trained and frozen
- Stage 2 three-condition dataset is collected
- model evaluation is complete
- drift rates are compared across conditions
- user feedback is summarized
- paper claims are careful and evidence-based
- final PDF and presentation are ready

---

## 15. Final Takeaway

The strongest version is no longer only:

> Can we predict drift?

It becomes:

> Can intention prompts and local drift-risk prediction reduce self-reported browser-session drift compared with passive monitored browsing?

This is more ambitious, but still achievable if the model-assisted check-in remains simple and the paper avoids overclaiming.
