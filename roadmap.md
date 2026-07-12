# DriftSense Lean 6-Week Research Roadmap

## Final Simplified Title

**DriftSense: Predicting Self-Reported Browser-Session Drift from Intention and Lightweight Activity Signals**

This title is intentionally careful. It makes clear that DriftSense predicts **self-reported drift**, not attention, addiction, emotion, ADHD, or productivity.

---

## 1. Core Research Framing

DriftSense studies whether a user's declared reason for opening a monitored website, combined with lightweight browser activity metadata, can predict whether the user later reports that the session drifted from the original intention.

The project is not:

- a website blocker
- a productivity dashboard paper
- a mental-health detection paper
- an addiction detection paper
- an ADHD detection paper
- an attention or emotion detection paper
- a real-time intervention paper
- an LLM intervention paper

The clean framing is:

> DriftSense evaluates a privacy-preserving browser-session labeling and prediction pipeline. It tests whether declared intention plus lightweight browser activity can predict self-reported session-level drift better than time-on-site or domain-category baselines.

---

## 2. Final Research Question

> Can declared browsing intention and lightweight browser activity signals predict self-reported browser-session drift better than time-on-site and domain-category baselines?

## 3. Final Contributions

Keep the paper to only three contributions:

1. **A privacy-preserving Chrome extension** that collects declared intention, lightweight browser activity metadata, and post-session reflection labels.
2. **A browser-session drift dataset** collected from real browsing behavior on configured monitored domains.
3. **A baseline model comparison** testing whether intention + activity predicts self-reported drift better than time-only, domain-only, intention-only, and activity-only models.

Do not claim novelty from the dashboard or from activity tracking alone.

---

## 4. How DriftSense Is Different From Related Work

| Related Work | What They Did | DriftSense Difference |
|---|---|---|
| Purpose Mode | Modified social media websites by toggling distracting interface features such as infinite scroll, autoplay, and recommendations. | DriftSense does not modify website UI. It labels and predicts whether a browser session drifted from the user's declared intention. |
| MindShift | Used LLM-based mental-state and context-aware smartphone intervention messages. | DriftSense does not infer mental state and does not use LLM intervention. It uses declared intention, metadata, and self-report labels. |
| StayFocused | Evaluated reflective prompts and chatbot support for smartphone focus and compulsive use. | DriftSense does not evaluate focus duration. It evaluates drift classification and prompt acceptability. |
| Before You Scroll Again | Studied regretful smartphone/social media sessions and intention-vs-actual use gaps. | DriftSense is browser-based, privacy-preserving, does not require wearables, and compares lightweight browser metadata + intention against simple baselines. |

Best claim:

> Unlike prior work that evaluates interface modification, smartphone-use interventions, or regret prediction, DriftSense evaluates a privacy-preserving browser-session labeling and prediction pipeline.

---

## 5. Final Study Design

Run a simple **7-day field study**.

Participants browse normally. DriftSense does not block websites, change website interfaces, or send real-time intervention messages.

### Target Dataset

Aim for:

- **20-25 participants**
- **7 days**
- **400-800 labeled sessions**
- Chrome or Chromium-based browser users
- configured monitored domains only
- local-first export

Minimum acceptable:

- 15 participants
- 7 days
- 300-400 labeled sessions

Stretch target:

- 30+ participants
- 800-1,200 labeled sessions

If the dataset is small, frame the paper as a feasibility study, not a generalizable final model.

---

## 6. Participant Procedure

Participants install the DriftSense Chrome extension and configure monitored domains such as:

- YouTube
- Facebook
- Reddit
- Instagram
- X
- LinkedIn
- news websites
- custom participant-selected domains

When a participant opens a monitored domain:

1. DriftSense asks: **Why are you opening this?**
2. Participant selects an intention.
3. Participant browses normally.
4. DriftSense records only lightweight metadata.
5. After the session, DriftSense asks: **Did this visit match your original intention?**
6. Participant's answer becomes the self-reported drift label.

---

## 7. Prompt Design

### Pre-Session Intention Prompt

Question:

> Why are you opening this?

Options:

- Specific information
- Intentional break
- Boredom
- Avoiding work
- Accidental click

Optional:

- Intended duration in minutes

### Post-Session Reflection Prompt

Question:

> Did this visit match your original intention?

Options:

- Yes
- No, I drifted
- Continue intentionally
- Save for later

### Labeling Rule

Use only clear labels for the main binary classification task:

| Answer | Label |
|---|---|
| Yes | non-drift, 0 |
| No, I drifted | drift, 1 |

Handle these separately or exclude from the binary task:

- Continue intentionally
- Save for later

Do not force ambiguous labels into drift/non-drift.

---

## 8. Privacy Rules

DriftSense may collect:

- anonymous participant ID
- session ID
- monitored domain
- domain category
- declared intention
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
- post-session reflection answer
- self-reported drift label

DriftSense must not collect:

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

All data should be stored locally first and exported only by the participant.

---

## 9. Dataset Files

Export two main CSV files.

### `sessions.csv`

Recommended columns:

```text
participant_id
session_id
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
timestamp_offset_seconds
clicks_in_window
scroll_events_in_window
keyboard_activity_in_window
idle_in_window
tab_focused
video_playing
url_domain_only
```

Use 5-second or 10-second activity windows. Keep the interval consistent.

---

## 10. Final Model Plan

Keep the model plan simple.

Train and compare:

1. **Time-threshold baseline**
2. **Domain-category baseline**
3. **Intention-only logistic regression**
4. **Activity-only Random Forest or XGBoost**
5. **Intention + activity Random Forest or XGBoost**

Use CatBoost/XGBoost only if setup is easy. Random Forest is acceptable for the first version.

Do not use GRU/TCN/deep learning in the main paper unless you collect 1,000+ labeled sessions. If used, put it in an optional appendix or future work.

---

## 11. Feature Sets

### Intention Features

- declared intention
- intended duration, if available

### Context Features

- domain category
- time of day
- day of week

### Activity Features

- duration
- click count
- scroll count
- keyboard activity count
- idle ratio
- active ratio
- video ratio
- tab focus loss count
- tab switch count
- average activity per minute

### Early Prediction

Keep early prediction simple:

- first 3 minutes
- full session

Do not evaluate 1 minute, 3 minutes, 5 minutes, and full session in the first paper. That makes the project too large. First 3 minutes versus full session is enough.

---

## 12. Data Split

Use a **participant-wise split**, not a random session split.

Recommended:

- 70% participants for training
- 15% participants for validation
- 15% participants for testing

Why:

> A random session split can put the same participant's browsing patterns in both train and test data, making the model look better than it really is.

If the participant count is too small for a stable 70/15/15 split, use leave-one-participant-out or repeated group cross-validation.

---

## 13. Evaluation Metrics

Primary metrics:

- F1-score
- ROC-AUC

Secondary metrics:

- accuracy
- precision
- recall
- confusion matrix

Do not rely on accuracy alone because drift/non-drift labels may be imbalanced.

### Main Evaluation Question

> Does intention + activity outperform time-only and domain-only baselines?

### Secondary Evaluation Question

> Does intention add value over activity-only prediction?

---

## 14. User Feedback Plan

Use a short post-study survey. Interviews are optional.

Survey dimensions:

- usefulness
- perceived control
- annoyance
- privacy concern
- clarity of intention prompt
- clarity of reflection prompt
- willingness to use again

Use 5-point Likert items plus 2-3 open-ended questions:

- What did you find useful?
- What did you find annoying?
- Were any intention options missing?
- Did the data collection feel acceptable?

Optional:

- 5 short interviews if time allows

Do not plan 10-15 interviews for the first version unless you have extra time.

---

## 15. What To Cut

Cut from the first paper:

- complex dashboard
- deep learning sequence model
- real-time intervention
- website UI modification
- LLM-based messages
- personalization
- cross-device tracking
- cloud backend
- large 40-60 participant study
- 12-week plan
- 10-15 interviews

Keep no matter what:

- Chrome extension
- intention prompt
- post-session reflection label
- privacy-safe metadata
- local export
- participant-wise split
- time baseline
- domain baseline
- intention-only baseline
- activity-only model
- intention + activity model
- F1-score and ROC-AUC
- prompt burden survey

---

## 16. Six-Week Execution Plan

### Week 1: Build the Minimum Working System

Goal:

> The extension can collect and export valid privacy-safe data.

Tasks:

- Finalize research question.
- Finalize data schema.
- Prepare consent form.
- Prepare participant instruction sheet.
- Build extension MVP:
  - monitored domains
  - intention prompt
  - activity metadata counting
  - post-session reflection
  - local storage
  - CSV export
  - delete-all-data button
- Create small synthetic CSV files.

End-of-week deliverables:

- working extension MVP
- `sessions.csv` export
- `activity_windows.csv` export
- consent draft
- participant instruction draft
- synthetic test dataset

Decision gate:

- Do not start participant recruitment until export works.

### Week 2: Pilot and Fix

Goal:

> Make sure the system is usable and the data is clean.

Tasks:

- Run pilot with 5-8 participants for 3 days.
- Check prompt clarity.
- Check whether post-session reflection appears correctly.
- Check whether exported files contain prohibited data.
- Fix session boundary bugs.
- Fix repeated-prompt issues.
- Build preprocessing script.
- Implement:
  - time baseline
  - domain baseline

End-of-week deliverables:

- pilot dataset
- bug-fix list
- revised extension
- preprocessing script
- two baselines

Decision gate:

- If pilot users find prompts confusing, fix wording before main study.

### Week 3: Start Main Data Collection

Goal:

> Begin the 7-day field study.

Tasks:

- Recruit 20-25 participants.
- Onboard participants.
- Start the 7-day study.
- Send a simple reminder after 2-3 days.
- Continue building ML scripts.
- Implement:
  - intention-only logistic regression
  - activity-only Random Forest
  - intention + activity Random Forest

End-of-week deliverables:

- main study running
- at least 20 participants onboarded
- baseline ML scripts ready
- paper sections drafted:
  - Introduction
  - Related Work
  - System Design
  - Methodology

Decision gate:

- If fewer than 15 participants are active, recruit more immediately.

### Week 4: Finish Collection and Clean Dataset

Goal:

> Prepare the final dataset for modeling.

Tasks:

- Finish 7-day data collection.
- Collect participant exports.
- Merge CSV files.
- Remove invalid/unlabeled sessions.
- Keep only clear Yes / No, I drifted labels for the binary task.
- Compute dataset summary:
  - participants
  - total sessions
  - labeled sessions
  - drift sessions
  - non-drift sessions
  - sessions per participant
  - domain distribution
- Create participant-wise train/validation/test split.
- Generate full-session features.
- Generate first-3-minute features.

End-of-week deliverables:

- cleaned dataset
- dataset summary table
- train/validation/test split
- full-session feature set
- first-3-minute feature set

Decision gate:

- If fewer than 400 labeled sessions are collected, frame the paper as a feasibility study.
- If 600+ labeled sessions are collected, proceed with the full baseline comparison confidently.

### Week 5: Model Evaluation and Results

Goal:

> Produce the final results tables and figures.

Tasks:

- Train and evaluate:
  - time baseline
  - domain baseline
  - intention-only logistic regression
  - activity-only Random Forest/XGBoost
  - intention + activity Random Forest/XGBoost
- Evaluate on:
  - full session
  - first 3 minutes
- Report:
  - F1-score
  - ROC-AUC
  - accuracy
  - precision
  - recall
  - confusion matrix
- Generate:
  - dataset summary table
  - model comparison table
  - early prediction comparison table
  - confusion matrix
  - ROC curve
  - feature importance chart
- Collect post-study survey responses.

End-of-week deliverables:

- final model results
- final tables
- final figures
- survey summary
- Results section draft

Decision gate:

- If intention + activity does not outperform baselines, report it honestly and explain possible reasons.
- Do not manipulate labels or remove valid sessions just to improve performance.

### Week 6: Paper and Final Package

Goal:

> Finish the paper and project package.

Tasks:

- Finish paper sections:
  - Abstract
  - Dataset
  - Results
  - Discussion
  - Limitations
  - Future Work
  - Conclusion
- Insert final tables and figures.
- Make all claims match the actual dataset.
- Emphasize limitations:
  - self-report label noise
  - small sample size
  - browser-only tracking
  - configured domains only
  - no claim of attention detection
  - no mental-health inference
- Prepare:
  - final PDF
  - final presentation slides
  - code README
  - data schema README
  - synthetic/sample dataset

End-of-week deliverables:

- complete paper draft
- complete final presentation
- cleaned code and README
- final results tables
- reproducibility package

---

## 17. Final Paper Structure

Use this structure:

1. Abstract
2. Introduction
3. Related Work
4. System Design
5. Dataset and Study Method
6. Drift Prediction Models
7. Results
8. Discussion
9. Limitations
10. Future Work
11. Conclusion
12. References

---

## 18. Required Tables

### Table 1: Dataset Summary

| Item | Value |
|---|---:|
| Participants | |
| Study duration | |
| Total sessions | |
| Labeled sessions | |
| Drift sessions | |
| Non-drift sessions | |
| Monitored domains | |

### Table 2: Model Comparison

| Model | Accuracy | Precision | Recall | F1 | ROC-AUC |
|---|---:|---:|---:|---:|---:|
| Time baseline | | | | | |
| Domain baseline | | | | | |
| Intention-only | | | | | |
| Activity-only | | | | | |
| Intention + activity | | | | | |

### Table 3: Early Prediction

| Model | 3-min F1 | Full F1 | 3-min ROC-AUC | Full ROC-AUC |
|---|---:|---:|---:|---:|

### Table 4: Survey Summary

| Measure | Mean | SD |
|---|---:|---:|
| Usefulness | | |
| Perceived control | | |
| Annoyance | | |
| Privacy concern | | |
| Prompt clarity | | |

---

## 19. Required Figures

Minimum figures:

1. System architecture
2. Session-labeling flow
3. Modeling pipeline
4. Dataset distribution
5. Model comparison chart
6. Confusion matrix
7. ROC curve
8. Feature importance chart

Optional:

- 3-minute vs full-session early prediction chart

---

## 20. Final Writing Rules

Use:

- "self-reported drift"
- "session-level intention mismatch"
- "we investigate"
- "we evaluate"
- "we estimate"
- "lightweight browser activity metadata"
- "privacy-preserving"

Avoid:

- "detects attention"
- "detects distraction"
- "detects addiction"
- "diagnoses ADHD"
- "detects emotion"
- "solves productivity"
- "knows the user's mental state"

Correct model-output sentence:

> The model outputs a session-level drift probability, estimating whether the participant is likely to later report that the browsing session did not match their declared intention.

---

## 21. Final Definition of Done

The project is done when:

- extension works on monitored domains
- prohibited data is not collected
- participant consent and instructions are ready
- 7-day field study is completed
- dataset is cleaned and documented
- participant-wise split is used if possible
- five model types are compared
- F1-score and ROC-AUC are reported
- first-3-minute and full-session results are compared
- survey feedback is summarized
- paper has honest limitations
- final PDF and presentation are ready

---

## 22. Final Takeaway

Do not overbuild.

The cleanest version of DriftSense is:

> Predicting self-reported browser-session drift from declared intention and lightweight browser activity, compared against simple time and domain baselines.

That is simple, different enough from related work, and achievable in six weeks.

