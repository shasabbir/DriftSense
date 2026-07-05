You are working as a senior full-stack engineer and research software engineer.

Project name: DriftSense

Goal:
Build a privacy-preserving Chrome extension and ML pipeline for a research project on browser-based digital drift. The system should collect lightweight browser-session activity signals, ask the user for browsing intention, ask post-session reflection, export a dataset, and train baseline + deep learning models for session-level drift prediction.

Important research framing:
This is NOT a website blocker.
This is NOT a generic productivity dashboard.
This is NOT attention/emotion/ADHD detection.
This is a research prototype for session-level intention-alignment and digital drift prediction.

Core research question:
Can declared browsing intention combined with lightweight browser activity signals predict whether a browser session becomes digital drift better than time-based or domain-based baselines?

Privacy constraints:

* Do not collect page text.
* Do not collect passwords.
* Do not collect screenshots.
* Do not collect full browsing history.
* Do not collect private messages.
* Do not collect source code.
* Do not collect keystroke content.
* Only track configured domains.
* Store data locally first.
* Provide export and delete-all-data features.
* No webcam or face detection in MVP.

Tech stack:

* Chrome Manifest V3 extension
* React + TypeScript for UI
* Vite for build tooling
* chrome.storage.local or IndexedDB for local storage
* Python for ML pipeline
* scikit-learn for baselines
* CatBoost or XGBoost for strong tabular model
* PyTorch for TCN/GRU deep model
* pandas, numpy, matplotlib, scikit-learn for analysis
* Export format: CSV and JSON

Repository structure:
driftsense/
extension/
manifest.json
src/
background/
content/
popup/
options/
dashboard/
shared/
package.json
vite.config.ts
README.md
ml/
data/
raw/
processed/
notebooks/
src/
preprocess.py
features.py
train_baselines.py
train_sequence_model.py
evaluate.py
export_figures.py
requirements.txt
README.md
paper/
outline.md
related_work.md
methodology.md
results_template.md
references.bib
AGENTS.md
README.md

Build Phase 1: Chrome extension MVP
Features:

1. Settings page where user can configure distraction-prone domains:

   * youtube.com
   * facebook.com
   * reddit.com
   * instagram.com
   * x.com
   * linkedin.com
   * news websites
   * custom domains

2. When user opens a configured domain, show a pre-session modal:
   Question: “Why are you opening this?”
   Options:

   * Specific information
   * Intentional break
   * Boredom
   * Avoiding work
   * Accidental click

3. After intention selection, allow site access.

4. Track session metadata only:

   * session_id
   * anonymous_user_id
   * domain
   * domain_category
   * declared_intention
   * start_time
   * end_time
   * duration_seconds
   * click_count
   * scroll_count
   * keyboard_activity_count, but not key values
   * idle_seconds
   * active_seconds
   * tab_focus_loss_count
   * tab_switch_count
   * video_playing_seconds if detectable
   * checkin_count
   * post_session_answer
   * drift_label
   * intended_duration_minutes if user provides it
   * actual_duration_seconds

5. Every 5 or 10 seconds, record an activity window:

   * session_id
   * timestamp_offset_seconds
   * clicks_in_window
   * scroll_events_in_window
   * keyboard_activity_in_window
   * idle_in_window
   * tab_focused
   * video_playing
   * url_domain_only

6. After configurable duration, show post-session reflection:
   Question: “Did this visit match your original intention?”
   Options:

   * Yes
   * No, I drifted
   * Continue intentionally
   * Save for later

7. Labeling rule:

   * Yes = drift_label 0
   * No, I drifted = drift_label 1
   * Continue intentionally = extended_intentional
   * Save for later = interrupted_or_deferred

8. Dashboard:

   * total configured-domain sessions
   * drift sessions
   * non-drift sessions
   * top drift domains
   * intention distribution
   * average session duration
   * active vs passive sessions
   * daily/weekly trend
   * export CSV/JSON button
   * delete all data button

Build Phase 2: Data export
Create exports:

1. sessions.csv
2. activity_windows.csv
3. sessions.json
4. README describing schema

Build Phase 3: ML pipeline
Implement preprocessing:

* Load sessions.csv and activity_windows.csv
* Clean invalid sessions
* Remove sessions without labels
* Create train/validation/test split
* Support user-wise split if user IDs exist
* Generate tabular aggregate features
* Generate sequence tensors for deep learning

Tabular features:

* declared_intention
* domain_category
* time_of_day
* day_of_week
* duration_so_far
* total_clicks
* total_scrolls
* total_keyboard_activity
* idle_ratio
* active_ratio
* video_ratio
* focus_loss_count
* tab_switch_count
* average_activity_per_minute
* first_1_min_activity
* first_3_min_activity
* first_5_min_activity

Models:

1. Time threshold baseline:

   * classify drift if duration > threshold
   * tune threshold on validation set

2. Domain baseline:

   * classify configured social/video domains as drift-prone

3. Intention-only logistic regression

4. Activity-only Random Forest or XGBoost/CatBoost

5. Intention + activity CatBoost/XGBoost

6. Deep learning sequence model:

   * TCN preferred
   * GRU acceptable
   * input: activity windows
   * static features: declared intention, domain category, time of day
   * output: drift probability

Early prediction:
Train/evaluate models using only:

* first 1 minute
* first 3 minutes
* first 5 minutes
* full session

Evaluation metrics:

* accuracy
* precision
* recall
* F1-score
* ROC-AUC
* confusion matrix
* calibration curve
* per-domain performance
* per-intention performance

Main hypothesis:
Intention + activity features outperform time-only and domain-only baselines for predicting self-reported digital drift.

Build Phase 4: Figures and tables
Generate:

1. Dataset summary table
2. Model comparison table
3. Confusion matrix
4. ROC curve
5. Early prediction performance chart
6. Feature importance chart for CatBoost/XGBoost
7. Dashboard screenshots placeholder folder

Implementation rules:

* Make small commits or logically separated changes.
* Add README setup instructions.
* Add comments where browser APIs are tricky.
* Add sample synthetic dataset so ML pipeline can run before real data collection.
* Add unit tests where practical.
* Do not overengineer backend/cloud.
* Keep everything local-first.

Definition of done:

* Extension builds successfully.
* Extension can add monitored domains.
* Extension shows intention prompt.
* Extension tracks activity metadata.
* Extension shows post-session prompt.
* Extension stores sessions locally.
* Extension exports CSV/JSON.
* Dashboard loads and displays summary.
* ML pipeline runs on synthetic data.
* Baseline models train successfully.
* TCN/GRU script trains successfully.
* Evaluation report is generated.
* README explains installation, usage, data schema, privacy constraints, and ML pipeline.

Start by creating the repository structure, AGENTS.md, README.md, and a phased TODO checklist. Then implement the extension MVP first.
