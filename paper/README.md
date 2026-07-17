# DriftSense Paper Folder

This folder contains the ACM `acmart` LaTeX paper draft up to the methodology section.

Files:

- `main.tex`: paper draft in ACM/CHI-compatible `acmart` format.
- `references.bib`: BibTeX references, prioritizing recent peer-reviewed HCI and journal work where possible.
- `diagram_prompts.md`: prompts for generating paper figures.

`figures/figure2.png` contains the retired five-option intention list and is no longer embedded. Generate the updated diagram from the Figure 2 prompt in `diagram_prompts.md` and save it as `figures/figure2-v2.png`; `main.tex` will use it automatically. Until then, the paper renders an accurate LaTeX fallback flow.

Compile from this folder with:

```powershell
pdflatex main.tex
bibtex main
pdflatex main.tex
pdflatex main.tex
```

The draft intentionally leaves empirical results as placeholders because no real DriftSense study data exists yet.
