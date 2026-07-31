# Diagram Prompts for DriftSense Paper

Place generated images in `paper/figures/` only after checking every label against
the current protocol. `main.tex` currently uses accurate LaTeX fallback diagrams;
the older `figure1.png` and `figure3.png` are retained assets but are not embedded
because they show the retired model and study design.

## Figure 1: System Architecture

Prompt:

```text
Create a clean academic HCI paper diagram for "DriftSense", a privacy-preserving Chrome extension and local ML pipeline. Show the horizontal flow: monitored domain opened; pre-session intention prompt; privacy-safe 10-second activity windows; local three-minute risk estimate; elevated-risk eligibility; 1:1 session-level randomization to reflective prompt or silent control; identical post-session reflection; local storage and participant-controlled export. Mark that prediction and randomization are disabled during the 10-day collection phase and enabled with a frozen model during the seven-day intervention phase. Under sensing include clicks, scrolls, keyboard activity count without values, idle time, focus loss, video status, and duration. Add a privacy boundary: no page text, titles, full URLs, screenshots, passwords, messages, keystroke values, or full history. Do not show deep models, passive baseline, static-prompt condition, exact risk percentages, or blocking. Style: grayscale with one muted accent color, simple vector shapes, readable labels, white background, suitable for an ACM-style paper.
```

## Figure 2: Session Labeling Flow

Prompt:

```text
Create a concise flow diagram for a browser-session labeling procedure. Start with "Open monitored domain", then "Declare intended activity" with seven neutral options: work or study task; learning or tutorial; specific information; communication or community; planned entertainment or break; open-ended browsing; opened accidentally. Then "Browse session" with lightweight aggregate activity windows. Then "Post-session reflection" with options: yes, it matched; no, I drifted; continue intentionally; save for later. End with labels: Yes maps to non-drift 0, No I drifted maps to drift 1, Continue intentionally and Save for later are retained as separate outcomes or excluded from binary analysis. Make clear that work is not automatically non-drift and leisure is not automatically drift. Style: academic, minimal, white background, no decorative icons, readable at single-column paper width. Save the final image as `paper/figures/figure2-v2.png`; this replaces the retired content in figure2.png.
```

## Figure 3: Modeling and Evaluation Pipeline

Prompt:

```text
Create an academic pipeline diagram for DriftSense's machine-learning evaluation. Inputs: private participant CSV files such as P01.csv, activity-window CSV files, and no repository dataset. Processing: validate exact schema, reject duplicate and overlapping sessions, preserve missing labels, use days 1-7 for development with participant-grouped folds, and reserve days 8-10 as chronological holdout. Create leakage-safe one-, three-, and five-minute and full-session tabular features. Models: time threshold baseline, training-derived domain baseline, intention-only logistic regression, activity-only logistic regression, intention plus activity logistic regression, and optional Random Forest. Outputs: accuracy, precision, recall, F1, ROC-AUC, confusion matrix, participant-held-out versus chronological performance, and a frozen three-minute logistic model with threshold. Then show elevated-risk Phase 2 sessions randomized 1:1 to reflective prompt or silent control. Do not show TCN, GRU, Transformer, three study conditions, or risk percentages shown to participants. Style: publication-ready flowchart, neutral colors, clear boxes and arrows, no 3D effects.
```
