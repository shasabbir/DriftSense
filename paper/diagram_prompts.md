# DriftSense Figure Sources and Future Prompts

The existing editable SVG files in `paper/figures/` describe the superseded
monitored-visit protocol. They are not embedded in the revised manuscript and
must be redrawn after the task-session implementation is stable. Protocol
figures show structure only and must contain no empirical DriftSense results.

## Protocol figures requiring revision

- `driftsense-architecture.svg`: replace monitored-domain entry with explicit
  task initiation, task-site/away-state sensing, 3/5/10-minute snapshots,
  participant calibration, local model decision, and randomization.
- `driftsense-labeling.svg`: replace old intention/action mapping with structured
  task types, aligned/moved-away/not-sure outcomes, and separate action choices.
- `driftsense-study-design.svg`: show 10--14-day Phase 1, model freeze,
  seven- to ten-day Phase 2, and separate RQ1/RQ2/RQ3 analyses.

The matching `.pdf` files are historical exports and are not used by the revised
`main.tex`. When restored, update the SVG and PDF together.

## Future Figure 3: prediction results

Generate only after the consented analysis is complete:

```text
Create a publication-ready, two-panel statistical figure using only the supplied
DriftSense result table. Panel A compares majority, elapsed-time,
intended-duration, task-site, task-only, activity-only, task-plus-activity, and
participant-calibrated logistic regression at 3, 5, and 10 minutes using
F1-score with participant-bootstrap 95% confidence intervals and visible cutoff
coverage. Panel B compares ROC-AUC under chronological known-participant and
participant-held-out evaluation. Preserve exact values and uncertainty; do not
invent, smooth, or extrapolate. Use direct labels, an accessible muted blue/teal/
amber palette, and a visible 0.5 chance reference for ROC-AUC. White background,
no 3D effects, and readable at ACM two-column width.
```

## Future Figure 4: randomized prompt result

Generate only after the consented analysis is complete:

```text
Create a publication-ready paired estimation plot from the supplied participant-
level DriftSense intervention results. Show each participant's drift proportion
under silent-control and reflective-prompt assignment with thin paired lines;
beside it show the overall paired difference and participant-bootstrap 95%
confidence interval. Include eligible-session counts and missing-label rates as
text, not decorative marks. Use assigned condition regardless of prompt response.
Do not include the Phase 1 versus Phase 2 difference as the causal estimate. Do
not invent values or significance markers. White background, accessible colors,
and readable at ACM two-column width.
```

## Future participant/session flow figure

Create this from final logged counts rather than illustration software when the
study is complete. It should report recruited, installed, completed, Phase 1
recorded and usable sessions, binary labels, sessions reaching 3/5/10 minutes, Phase 2
eligible sessions, cap suppressions, randomized assignments, prompt delivery
failures, and complete primary outcomes. Every branch must reconcile numerically.
