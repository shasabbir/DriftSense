# DriftSense Paper-Writing Prompt

Write an implementation-focused HCI paper about DriftSense without inventing
results. The central contribution is a privacy-preserving, intention-aware,
session-level drift prediction and reflective-intervention framework.

## Working Title

DriftSense: Privacy-Preserving Intention-Aware Prediction and Model-Assisted
Reflection for Browser-Based Digital Drift

## Construct

Define browser-based digital drift as a participant-reported mismatch between a
declared browsing intention and the eventual session outcome. Do not present the
label as objective attention, productivity, addiction, ADHD, mental health, or
emotion detection.

## Research Questions

1. Can declared intention plus lightweight browser activity predict
   self-reported drift better than time and domain baselines?
2. Among elevated-risk sessions, does a model-assisted reflective prompt reduce
   subsequent self-reported drift compared with a randomized silent control?

## System

Describe the Chrome Manifest V3 extension, monitored domains, neutral intention
prompt, aggregate activity counts, 10-second activity windows, post-session
reflection, local storage, dashboard, deletion controls, and participant export.

The privacy boundary excludes page text, titles, full URLs, query strings,
passwords, screenshots, messages, full history, source code, keystroke values,
webcam data, identity, emotion, and mental-state inference.

## Study Method

Use one cohort with a target of 20 completers.

### Phase 1

- 10 study days.
- Same intention and post-session prompts for every monitored session.
- No model-assisted mid-session prompt.
- Days 1-7 for development and days 8-10 as chronological holdout.
- Participant-grouped validation within development data.

Compare:

1. time threshold;
2. training-derived domain rule;
3. intention-only logistic regression;
4. activity-only logistic regression;
5. intention-plus-activity logistic regression; and
6. optional Random Forest.

Evaluate accuracy, precision, recall, F1, ROC-AUC, confusion matrix, and
leakage-safe one-, three-, and five-minute and full-session performance. Report
known-participant chronological and participant-held-out performance separately.
The primary deployed model is a frozen three-minute logistic regression.

### Phase 2

- Seven study days with the same cohort.
- Same intention, sensing, session, dashboard, and post-session measurement.
- At three minutes, elevated-risk eligible sessions are randomized 1:1.
- Reflective-prompt arm: show "Still here for your original reason?"
- Silent-control arm: render no mid-session interface.
- Show at most one prompt per session and three displayed prompts per day.
- Log assignment before rendering and preserve it across suspension.

The primary intervention outcome is the binary post-session drift proportion in
randomized eligible sessions. Compare participant-level paired proportions with
a Wilcoxon signed-rank test, paired difference, and participant-bootstrap 95%
confidence interval. Report missing labels by assignment. Add a mixed-effects
logistic sensitivity analysis only if the number of eligible sessions permits.

Treat Phase 1 versus Phase 2 comparisons as descriptive, not causal.

## Related Work

Discuss and interpret conservatively:

- Purpose Mode;
- MindShift;
- StayFocused;
- PauseNow;
- one sec;
- Self-Control in Cyberspace;
- digital self-control systematic reviews;
- Before You Scroll Again; and
- WellScreen.

Connect the gap to declared pre-session intention, privacy-safe browser signals,
post-session self-report, early prediction, weak baselines, and randomized
model-assisted reflection. Do not call PauseNow evaluated, do not hide null or
marginal findings, and identify Before You Scroll Again as a preprint unless its
publication status is independently verified.

## Paper Structure Through Methodology

1. Abstract
2. Introduction and two research questions
3. Related Work
4. System Design
5. Drift Prediction and Model-Assisted Reflection
6. Methodology
   - study design;
   - participants and recruitment;
   - consent, privacy, and data handling;
   - Phase 1 collection;
   - model development and freeze;
   - Phase 2 micro-randomized intervention;
   - measures;
   - data processing and quality checks; and
   - analysis plan.

## Writing Rules

- Distinguish implemented Phase 1 features from planned Phase 2 features.
- Never fabricate a participant count, session count, model score, p-value, or
  effect size.
- Preserve missing and non-binary outcomes rather than treating them as
  non-drift.
- Avoid claiming that less browsing time is automatically better.
- Describe any seven-day intervention effect as preliminary and short-term.
- Report null, marginal, burdensome, or mistimed intervention outcomes honestly.
- Keep real participant files outside the repository.
