# Frozen checkpoint model

Place the validated `frozen_model.json` produced by `ml/model_development.py`
in this directory before building Phase 2. The extension deliberately fails
closed when it is absent and never substitutes the full-session model.
