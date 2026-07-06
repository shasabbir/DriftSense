# Diagram Prompts for DriftSense Paper

Place generated images in `paper/figures/` and update the placeholders in `main.tex`.

## Figure 1: System Architecture

Prompt:

```text
Create a clean academic HCI paper diagram for "DriftSense", a privacy-preserving Chrome extension and local ML pipeline. Show four horizontal stages from left to right: (1) Monitored domain opened in Chrome, (2) pre-session intention prompt, (3) lightweight metadata and activity-window logging, (4) post-session reflection and local storage/export. Under the logging stage, include small labels: clicks, scrolls, keyboard count only, idle time, tab focus, video status, duration. Add a clear privacy boundary box: no page text, no screenshots, no passwords, no messages, no full history. On the far right show CSV/JSON export feeding local ML models: time baseline, domain baseline, intention-only, activity-only, intention plus activity, TCN/GRU. Style: grayscale with one muted accent color, simple vector shapes, readable labels, white background, suitable for an ACM-style paper.
```

## Figure 2: Session Labeling Flow

Prompt:

```text
Create a concise flow diagram for a browser-session labeling procedure. Start with "Open monitored domain", then "Declare intention" with options: specific information, intentional break, boredom, avoiding work, accidental click. Then "Browse session" with lightweight activity windows every 5 or 10 seconds. Then "Post-session reflection" with options: yes, no I drifted, continue intentionally, save for later. End with labels: Yes maps to non-drift 0, No I drifted maps to drift 1, Continue intentionally and Save for later are retained as separate outcomes or excluded from binary analysis. Style: academic, minimal, white background, no decorative icons, readable at single-column paper width.
```

## Figure 3: Modeling and Evaluation Pipeline

Prompt:

```text
Create an academic pipeline diagram for DriftSense's machine-learning evaluation. Inputs: sessions.csv and activity_windows.csv. Processing: clean invalid sessions, remove unlabeled sessions, user-wise train/validation/test split, aggregate tabular features, sequence tensors. Models: time threshold baseline, domain baseline, intention-only logistic regression, activity-only random forest or XGBoost, intention plus activity CatBoost/XGBoost, sequence TCN/GRU. Evaluation outputs: accuracy, precision, recall, F1, ROC-AUC, calibration, confusion matrix, per-domain and per-intention analysis, early prediction at 1, 3, 5 minutes and full session. Style: publication-ready flowchart, neutral colors, clear boxes and arrows, no 3D effects.
```

