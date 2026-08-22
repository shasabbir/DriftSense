# DriftSense Paper Folder

This folder contains the ACM `acmart` LaTeX paper draft through the revised
planned methodology. The protocol uses one cohort of 19--25 participants, a
10--14-day collection phase targeting about 600 usable binary-labeled task
sessions, participant-calibrated early prediction at 3, 5, and 10 minutes, and
a seven- to ten-day micro-randomized intervention in which model-eligible
sessions are assigned to a nonblocking reflective prompt or silent control.
The related-work claims and protocol rationale were checked against the local
PDFs in `downloads/` on 2026-08-01.

Files:

- `main.tex`: paper draft in ACM/CHI-compatible `acmart` format.
- `main_humanized.tex`: compatibility entry point that inputs `main.tex`, kept
  so existing compile commands cannot produce a stale protocol variant.
- `main_humanized.pdf`: compiled humanized manuscript.
- `references.bib`: BibTeX references, prioritizing recent peer-reviewed HCI and journal work where possible.
- `related.md`: evidence summaries that support the study gap and evaluation.
- `figures/`: editable SVG figure masters, vector-PDF exports, and the two implemented-UI captures used by LaTeX.
- `figure_list.md`: current and planned figures, including result placeholders.
- `table_list.md`: current and planned tables, including result placeholders.
- `diagram_prompts.md`: figure provenance and prompts for future empirical plots.
- `downloads/`: the local paper corpus used for the evidence audit.

The current architecture, study-design, labeling, and UI figures describe the
earlier monitored-visit protocol and are not embedded in the revised manuscript.
They must be redrawn from the implemented task-session flow before restoration.
Edit an SVG master and regenerate its PDF export together.

Regenerate all active vector-PDF figures from their SVG masters with:

```powershell
.\figures\export_svg.ps1
```

Compile from this folder with:

```powershell
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

Compile the compatibility entry point with:

```powershell
pdflatex main_humanized.tex
bibtex main_humanized
pdflatex main_humanized.tex
pdflatex main_humanized.tex
```

The draft contains no empirical DriftSense results because real participant
collection has not yet occurred. Do not add performance values, significance
tests, or effect sizes until the consented dataset has been analyzed. Numerical
results cited from prior work must remain attributed to those papers.
