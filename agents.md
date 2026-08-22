# AGENTS.md

## Project

Project name: DriftSense

DriftSense is a browser-based digital-wellbeing research prototype. It studies whether a user-declared browser task and lightweight, content-free activity signals can predict session-level goal deviation early enough to support a neutral reflective check-in.

## Core Research Claim

The project is not generic activity tracking, website classification, or productivity scoring. The central contribution is:

A privacy-preserving, participant-calibrated early prediction model that combines structured task context, lightweight browser activity, participant-relative usage features, and post-session self-report, followed by a randomized evaluation of model-triggered reflection.

Use **task site** or **participant-approved task site**, not **productive website**. A hostname is context, never evidence that activity is productive, distracting, aligned, or drift.

## Study Structure

1. Run a small technical and usability pilot; do not silently merge pilot records into the main study.
2. Phase 1: collect approximately 700 sessions to obtain about 600 usable binary-labeled task sessions from 19--25 participants over 10--14 days, with no model-assisted prompt.
3. Develop and freeze a simple model using leakage-safe features at 3, 5, and 10 minutes.
4. Phase 2: for sessions that meet the frozen model's eligibility rule, randomize 1:1 between a nonblocking reflective side prompt and a silent control.
5. Evaluate prediction and intervention separately. Phase 1--Phase 2 change is descriptive, not causal.

The 600-session target applies to usable Phase 1 binary-labeled sessions. Phase 2 requires new sessions and should target 150--200 randomized eligible sessions where feasible. These are feasibility targets, not formal power calculations.

## Construct and Labels

Digital drift means participant-reported deviation from the task declared at session start. It is not inferred attention or objective productivity.

At task start, collect one structured task type: writing/creating, coding/problem solving, reading/research, learning/tutorial, communication/coordination, or other planned task. Do not collect free-text task descriptions in the primary study unless the privacy protocol is explicitly revised.

At the real session boundary, ask whether the session remained aligned with the declared task:

* explicit aligned response -> `0`
* explicit moved-away/drift response -> `1`
* not sure, missing, or action-only response -> unlabeled and excluded from the primary binary model

Keep outcome measurement separate from actions such as continue, finish, remind later, or dismiss.

## Session and Prompt Rules

* A task session is user initiated or explicitly confirmed; merely opening a hostname is not sufficient evidence of a task.
* Participants select sites they use for planned tasks, including mixed-use sites when relevant.
* Leaving one task site is not automatically drift and may be necessary for the task.
* If activity outside the approved task-site set is measured, store only aggregate away time/state, not destination URLs or browsing history.
* Intended duration is context or a checkpoint, not the automatic post-session boundary.
* Capture the outcome after the real session boundary or through a recoverable pending reflection.
* Phase 1 shows no model-assisted mid-session prompt.
* Phase 2 shows at most one nonblocking reflective prompt per session and applies a prespecified daily cap.
* Never display a risk probability or tell a participant that the model knows they are drifting.

## Do Not Overclaim

Never claim:

* addiction detection
* ADHD diagnosis
* mental health diagnosis
* true attention detection
* emotion detection
* objective productivity measurement or general productivity optimization
* surveillance or semantic understanding of page activity
* webcam-based monitoring
* novelty of dashboarding or activity tracking alone
* personalization from a separate high-capacity model per participant with this sample size

Use **participant-calibrated** for participant-relative features. Use **personalized model** only if there is enough per-participant data and a separately validated personal model.

## Privacy Rules

Do not collect:

* page text, page titles, paths, or query strings
* free-text task content by default
* passwords, screenshots, private messages, or source code
* full browsing history or destination domains outside the approved task-site set
* keystroke values
* webcam images or face identity
* emotion or inferred mental-state data

Allowed data:

* participant-approved task-site hostname
* structured task type and intended duration
* session timing and checkpoint offset
* scroll, click, and keyboard-activity counts without values
* idle and active time
* tab focus and tab-switch counts
* aggregate time outside the approved task-site set without destination identity
* accessible video playback status
* post-session alignment answer
* local anonymous participant ID
* local model, eligibility, randomization, delivery, response, and suppression audit fields in Phase 2

## Implementation Stack

Extension: Chrome Manifest V3, React, TypeScript, Vite, and `chrome.storage.local` or IndexedDB.

ML: Python, pandas, numpy, scikit-learn, matplotlib, and optional Random Forest, CatBoost, or XGBoost for secondary offline comparison.

Paper: Markdown-first notes, ACM-style LaTeX, and BibTeX references.

## Repository Structure

`extension/` -- Chrome extension source

`ml/` -- preprocessing, training, evaluation, and notebooks

`paper/` -- paper draft, references, figure list, and table list

`data/` -- schema documentation only; keep all real participant exports outside the repository and Git history

## Definition of Done for Implementation Tasks

A task is done only when:

* code builds and relevant tests pass
* relevant commands, README, and schemas are updated
* privacy rules are respected and no prohibited data is collected
* session-boundary and pending-reflection behavior is tested
* export and schema tests pass with isolated fixtures
* 3-, 5-, and 10-minute features contain no post-cutoff information
* Python and TypeScript inference agree for the frozen model
* prompt assignment, persistence, cap, and silent control are auditable

## Definition of Done for Paper Tasks

A paper task is done only when:

* claims match the implemented protocol
* no fake results are invented and missing results remain placeholders
* related work is connected to the research gap
* limitations and feasibility framing are honest
* prediction and intervention evidence are kept separate
* participant-calibrated and unseen-user claims are not conflated
* current figures and tables match the revised protocol

## Main Baselines

Always compare against:

* majority-class baseline
* fixed elapsed-time threshold
* intended-duration or elapsed-to-intended-duration baseline
* task-site/domain baseline
* task-type-only baseline
* activity-only logistic regression
* task-type plus activity logistic regression
* task-type plus participant-relative activity logistic regression

## Main Metrics

Use accuracy, precision, recall, F1-score, ROC-AUC, confusion matrix, calibration where feasible, early prediction at 3/5/10 minutes, usable-session coverage at each cutoff, and expected prompt rate/false-prompt burden at the frozen threshold.

For Phase 2 also report randomized eligible-session counts, assignment-specific missing labels, drift proportion, prompt responses, prompt frequency, annoyance, usefulness, and prompt-delivery failures.

## Preferred Modeling Order

1. Rule-based time and intended-duration baselines
2. Logistic regression with task context
3. Logistic regression with activity
4. Logistic regression with task context plus activity
5. Logistic regression with participant-relative activity features
6. Random Forest as an optional robustness comparison
7. CatBoost or XGBoost as secondary offline checks only

Do not use a GRU, TCN, Transformer, or separate high-capacity per-person model for the first 600-session pilot.

## Validation Rules

* Fit preprocessing only on training data.
* Derive participant history and relative features using prior sessions only.
* Use participant-grouped development folds.
* Reserve a chronological known-participant holdout.
* Report participant-held-out unseen-user performance separately.
* At each cutoff, report the number of sessions still observable and labeled.
* Compare cutoff-specific cohorts and the common subset reaching 10 minutes.
* Freeze one checkpoint policy, model, preprocessing specification, threshold, and prompt cap before Phase 2.

## Main Paper Framing

Fixed timers and domain-based controls cannot distinguish normal task behavior from a pattern that is unusual for the task or participant. DriftSense investigates whether structured task context and participant-relative, content-free browser activity can predict later self-reported goal deviation at 3, 5, or 10 minutes, and whether a single model-triggered reflective prompt improves short-term alignment compared with a randomized silent control.

The contribution is not classifying websites as productive. It is early, privacy-preserving, participant-calibrated task-alignment prediction plus a randomized test of reflective support.
