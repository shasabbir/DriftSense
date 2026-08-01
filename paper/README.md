# DriftSense Paper Folder

This folder contains the ACM `acmart` LaTeX paper draft through the complete
planned methodology. The protocol uses one cohort, a 10-day collection phase,
a frozen three-minute model, and a seven-day micro-randomized intervention in
which elevated-risk sessions are assigned to a reflective prompt or silent
control. The related-work claims and protocol rationale were checked against
the local PDFs in `downloads/` on 2026-08-01.

Files:

- `main.tex`: paper draft in ACM/CHI-compatible `acmart` format.
- `main_humanized.tex`: separately compiled prose revision based on
  `humanized.txt`, with factual and methodological errors corrected.
- `main_humanized.pdf`: compiled humanized manuscript.
- `references.bib`: BibTeX references, prioritizing recent peer-reviewed HCI and journal work where possible.
- `related.md`: evidence summaries that support the study gap and evaluation.
- `figures/`: editable SVG figure masters, vector-PDF exports, and the two implemented-UI captures used by LaTeX.
- `figure_list.md`: current and planned figures, including result placeholders.
- `table_list.md`: current and planned tables, including result placeholders.
- `diagram_prompts.md`: figure provenance and prompts for future empirical plots.
- `downloads/`: the local paper corpus used for the evidence audit.

`figures/figure1.png`, `figure2.png`, and `figure3.png` contain retired elements
of earlier designs and are not embedded. The manuscript uses
`driftsense-architecture`, `driftsense-study-design`, and the intention/reflection
captures from the implemented collection prototype; the editable
`driftsense-labeling` diagram is retained as optional supplementary material.
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

Compile the separate prose revision with:

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
