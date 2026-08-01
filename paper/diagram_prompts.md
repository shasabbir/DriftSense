# DriftSense Figure Sources and Future Prompts

The protocol figures are established as editable SVG files in `paper/figures/`.
The architecture and study-design diagrams are embedded through vector-PDF
exports; the labeling diagram is retained as optional supplementary material.
They show structure only and contain no empirical DriftSense results.

## Active protocol figures

- `driftsense-architecture.svg`: local-first sensing, model decision,
  randomization, post-session reflection, and the privacy boundary.
- `driftsense-labeling.svg`: optional supplementary diagram of neutral
  intentions and the response-to-label mapping.
- `driftsense-study-design.svg`: ten-day observation, model freeze, seven-day
  intervention, and the separate RQ1/RQ2 analyses.

The matching `.pdf` files are publication exports used by `main.tex`. When a
label or protocol decision changes, update the SVG and PDF together.

## Future Figure 3: prediction results

Generate only after the consented analysis is complete:

```text
Create a publication-ready, two-panel statistical figure using only the supplied
DriftSense result table. Panel A compares time threshold, domain, intention-only,
activity-only, intention-plus-activity logistic regression, and Random Forest at
1, 3, and 5 minutes using F1-score with participant-bootstrap 95% confidence
intervals. Panel B compares ROC-AUC under chronological known-user and
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
sessions, binary-labeled sessions, sessions reaching three minutes, Phase 2
eligible sessions, cap suppressions, randomized assignments, prompt delivery
failures, and complete primary outcomes. Every branch must reconcile numerically.
