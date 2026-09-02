# DriftSense Model Output Explanation

## What was built

The final artifact is a full-session logistic-regression model. It estimates the probability that a participant will report `moved_away` after a declared task session. It uses aggregate activity available when the session ends and does not use the post-session answer as an input.

The dataset contained 665 sessions from 19 participants. Of these, 634 had usable binary labels: 358 `aligned` and 276 `moved_away`. The remaining 31 uncertain or missing responses were excluded from model training.

## What each model is based on

| Model | Inputs | What it tests |
|---|---|---|
| `majority_class` | Training-set label prevalence | Whether a model beats always predicting the common class |
| `fixed_timer_prompt_all` | No behavioral inputs; every session is positive | The burden and recall of prompting everyone |
| `intended_duration_only` | Intended duration and elapsed-to-intended-duration ratio | Whether planned versus actual duration is enough |
| `task_site_domain_only` | Initial participant-approved task site | Whether hostname context alone predicts the answer |
| `task_type_only` | Structured task type | Whether the declared kind of task is sufficient |
| `context_only` | Intended duration, duration ratio, task-site count, task type, and initial task site | Combined task context without activity |
| `activity_only` | Session duration; click, scroll, keyboard, idle, active, away, tab-switch, and video totals plus rates or shares | Whether content-free activity patterns predict the answer |
| `context_activity` | Context and activity features | Whether task context enriches activity |
| `context_activity_time` | Context, activity, start hour, and weekday | Whether timing adds useful information |
| `participant_calibrated_context_activity` | Context, activity, timing, prior drift rate, prior-session count, and differences from earlier aligned sessions | Whether prior participant behavior adds value without training a separate model per person |

Numeric variables were median-imputed, standardized, and regularized. Skewed totals were transformed with `log1p`; categorical variables were one-hot encoded. `participant_id` was used for grouping and history construction but was never a model feature. The current session's post-session answer and label were never inputs.

## Model selection

Participant-relative days 1-7 were used for development, with repeated participant-grouped cross-validation. Later sessions were reserved as a chronological known-participant holdout. This prevents ordinary row-level mixing of the same participant across training and validation.

The selected model was an activity-only L2-regularized logistic regression with `C=0.1`. Its grouped-development ROC-AUC was 0.925. Adding task type, task site, time, and participant-relative features did not improve development performance enough to justify the additional complexity.

`C=0.1` means relatively strong regularization, which reduces unstable coefficients and overfitting in this modest dataset. Model family and `C` were selected using development data only. The chronological holdout was opened after selection and was not used to switch models.

## Holdout result

The final evaluation used 193 later sessions from 18 participants.

| Metric | Result |
|---|---:|
| ROC-AUC | 0.931 |
| ROC-AUC participant-bootstrap 95% CI | 0.891-0.962 |
| Accuracy | 0.860 |
| Precision | 0.907 |
| Recall | 0.773 |
| F1 | 0.834 |
| Brier score | 0.109 |
| Positive-decision rate | 38.9% |
| False-positive share of positive decisions | 9.3% |

These threshold-based results use the development-selected threshold of `0.6129`, chosen under a maximum 35% development positive-decision rate. On the holdout, 75 sessions crossed the threshold: 68 were reported as drift and 7 as aligned.

### How to read the metrics

| Value | General meaning | Meaning here |
|---|---|---|
| ROC-AUC `0.931` | Ranking ability; `0.5` is chance and `1.0` is perfect | The model ranks a randomly selected drift session above an aligned session about 93.1% of the time |
| 95% CI `0.891-0.962` | Plausible range after participant-level resampling | The interval remains well above `0.5`, supporting above-chance discrimination in this holdout |
| Precision `0.907` | Correct positive decisions divided by all positive decisions | About 90.7% of sessions crossing the threshold were reported as drift |
| Recall `0.773` | Detected drift sessions divided by all drift sessions | The model detected about 77.3% of reported drift sessions and missed about 22.7% |
| F1 `0.834` | Combined precision-recall score; higher is better | Precision and recall are both strong at the frozen threshold |
| Brier `0.109` | Mean squared probability error; `0` is perfect | Probability error is substantially below the majority baseline's `0.249` on the same holdout |
| Positive-decision rate `38.9%` | Share of sessions crossing the threshold | Roughly four of every ten sessions would receive a positive model decision |
| False-positive share `9.3%` | False positives divided by all positive decisions | About one of every eleven positive decisions occurred on a session later reported as aligned |

The confusion matrix at threshold `0.6129` was: 68 true positives, 7 false positives, 98 true negatives, and 20 false negatives.

## How active seconds contributes

The model does not use an arbitrary manual weight for `active_seconds`. It represents active time in two ways: `active_share = active_seconds / duration_seconds` and `log1p_active_seconds`. Both are standardized before logistic regression, so active time is evaluated on the same scale as the other numeric features.

In the final refit, `active_share` has the largest absolute standardized coefficient (`-1.238`). A higher active share therefore lowers the estimated probability of a later `moved_away` report, holding the other model inputs fixed. `log1p_active_seconds` also has a negative coefficient (`-0.120`). These coefficients show association, not causation or objective attention.

Raw active seconds is strongly tied to session duration, and active, idle, and away shares sum to one. Coefficients for those correlated fields should therefore not be interpreted as independent causal effects. Manually increasing the active-time weight would make the reported performance less defensible and was not done.

## Interpretation

The activity-only model clearly outperformed the context-only baseline in grouped development (`0.925` versus `0.552` ROC-AUC). Richer models produced slightly higher holdout ROC-AUCs, up to `0.936`, but they were not selected because the model family was frozen from development performance before examining the holdout.

The appropriate conclusion is that aggregate full-session activity strongly predicts the later self-report in this dataset under the specified known-participant chronological evaluation. It does not establish causation, generalization to new participants, or intervention benefit.

This artifact is valid for session-end research analysis. It should not be presented as a validated mid-session checkpoint predictor, and its probability must not replace the participant's explicit reflection response.

## Output files

- `full_session_model.json`: portable model and preprocessing parameters
- `full_session_model.joblib`: fitted Python pipeline
- `full_session_model_comparison.csv`: baseline and model results
- `full_session_calibration.csv`: predicted versus observed risk bins
- `full_session_coefficients.csv`: fitted coefficient ranking
- `full_session_test_vectors.json`: shared probability-verification cases
- `full_session_summary.json`: dataset, split, threshold, metric, and parity summary
- `full_session_tuning.csv`: development-only regularization results
- `FULL_SESSION_MODEL_CARD.md`: intended use and limitations
