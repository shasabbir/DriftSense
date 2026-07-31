# DriftSense Paper Folder

This folder contains the ACM `acmart` LaTeX paper draft through the complete
planned methodology. The protocol uses one cohort, a 10-day collection phase,
a frozen three-minute model, and a seven-day micro-randomized intervention in
which elevated-risk sessions are assigned to a reflective prompt or silent
control.

Files:

- `main.tex`: paper draft in ACM/CHI-compatible `acmart` format.
- `references.bib`: BibTeX references, prioritizing recent peer-reviewed HCI and journal work where possible.
- `related.md`: evidence summaries that support the study gap and evaluation.
- `diagram_prompts.md`: prompts for future protocol-consistent figures.

`figures/figure1.png`, `figure2.png`, and `figure3.png` contain retired elements
of earlier designs. They are not embedded by the current draft. Generate updated
diagrams from `diagram_prompts.md` only after checking every label; until then,
`main.tex` renders accurate LaTeX fallback flows.

Compile from this folder with:

```powershell
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

The draft contains no empirical results because real participant collection has
not yet occurred. Do not add performance values, significance tests, or effect
sizes until the consented dataset has been analyzed.
