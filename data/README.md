# Research data

This repository does not contain a participant dataset. Collect sessions with
the DriftSense extension only after consent and ethics requirements are met.
Each participant exports a file named with their anonymous participant code,
such as `P01.csv`.

Store real exports in a private, access-controlled directory outside this
repository. Do not commit participant CSVs, combined datasets, or export ZIPs.
The repository ignore rules are a safeguard, not a substitute for appropriate
data handling.

Combine consented participant exports outside the repository with:

```powershell
python ml/combine_participant_csv.py --input D:\private\driftsense\participants --output D:\private\driftsense\data.csv
```

The combined file contains only complete sessions with a binary post-session
reflection label. Original participant exports remain unchanged.
