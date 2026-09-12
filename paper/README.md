# DriftSense Paper Folder

This folder contains the canonical Human Technology-targeted LaTeX manuscript. It presents the
DriftSense two-phase architecture, Phase 1 data collection and model development,
the Phase 2 rolling model and ESP32 tangible interface, and completed post-study
interviews with 12 participants. The manuscript reports interview evidence as
descriptive self-report and does not present it as a randomized causal effect.
It includes a reader-facing key-terms section and 29 cited works, with recent
research prioritized and older work retained only where it establishes a
foundational concept.
The related-work claims and protocol rationale are grounded in the local PDFs
in `downloads/` and the evidence notes in `related.md`.

Files:

- `main.tex`: complete canonical manuscript in a one-column A4 Human Technology working format.
- `main_humanized.tex`: legacy compatibility entry point that inputs `main.tex`.
- `main_humanized.pdf`: historical build; use `main.pdf` for the current manuscript.
- `references.bib`: BibTeX references, prioritizing recent peer-reviewed HCI and journal work where possible.
- `related.md`: evidence summaries that support the study gap and evaluation.
- `post_study_interview_questionnaire.md`: three-stage baseline, post-Phase 1,
  and post-Phase 2 questionnaires and semi-structured interview guides.
- `figures/`: historical figure assets plus the two current implemented-interface captures used by LaTeX.
- `figure_list.md`: inventory of the seven figures embedded in the manuscript.
- `table_list.md`: inventory of the comparison table and evidence retained in prose or figures.
- `diagram_prompts.md`: figure provenance and prompts for future empirical plots.
- `downloads/`: the local paper corpus used for the evidence audit.

The manuscript uses native TikZ for the study workflow, tangible front panel and state flow,
privacy boundary, rolling policy, model summary, and interview chart. Older files
under `figures/` remain historical assets and are not embedded unless revised
against the implemented task-session flow.

Compile from this folder with:

```powershell
xelatex main.tex
bibtex main
xelatex main.tex
xelatex main.tex
```

The manuscript reports the genuine Phase 1 session dataset, completed-session
model validation, implemented Phase 2 system, and completed interview findings
from 12 participants. It explicitly distinguishes retrospective model evidence
from unmeasured early-window accuracy and does not claim a randomized causal
intervention effect.
