# DriftSense Model Output Explanation

## What was built

The final artifact is a full-session logistic-regression model. It estimates the probability that a participant will report `moved_away` after a declared task session. It uses aggregate activity available when the session ends and does not use the post-session answer as an input.

The dataset contained 665 sessions from 19 participants. Of these, 634 had usable binary labels: 442 `aligned` and 192 `moved_away`. The remaining 31 uncertain responses were excluded from model training.

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

The selected model was an activity-only L2-regularized logistic regression with `C=0.1`. Its grouped-development ROC-AUC was 0.579. Adding task type, task site, time, and participant-relative features did not improve development performance enough to justify the additional complexity.

`C=0.1` means relatively strong regularization, which reduces unstable coefficients and overfitting in this modest dataset. Model family and `C` were selected using development data only. The chronological holdout was opened after selection and was not used to switch models.

## Holdout result

The final evaluation used 193 later sessions from 18 participants.

| Metric | Result |
|---|---:|
| ROC-AUC | 0.566 |
| ROC-AUC participant-bootstrap 95% CI | 0.469-0.670 |
| Precision | 0.303 |
| Recall | 0.451 |
| F1 | 0.362 |
| Positive-decision rate | 39.4% |

These threshold-based results use the development-selected threshold of `0.3626`. The lower threshold increases recall, but approximately 69.7% of positive decisions in the holdout were false positives.

### How to read the metrics

| Value | General meaning | Meaning here |
|---|---|---|
| ROC-AUC `0.566` | Ranking ability; `0.5` is chance and `1.0` is perfect | The model ranks a randomly selected drift session above an aligned session about 56.6% of the time: only modestly above chance |
| 95% CI `0.469-0.670` | Plausible range after participant-level resampling | The range includes `0.5`, so above-chance discrimination is not established with confidence |
| Precision `0.303` | Correct positive decisions divided by all positive decisions | About 30.3% of sessions flagged by the model were reported as drift |
| Recall `0.451` | Detected drift sessions divided by all drift sessions | The model detected about 45.1% of reported drift sessions and missed about 54.9% |
| F1 `0.362` | Combined precision-recall score; higher is better | The balance between detection and false positives is weak |
| Brier `0.199` | Mean squared probability error; `0` is perfect | Probability accuracy is close to the majority baseline's `0.197`, so calibration adds little improvement |
| Positive-decision rate `39.4%` | Share of sessions crossing the threshold | Roughly four of every ten sessions would receive a positive model decision |
| False-positive share `69.7%` | False positives divided by all positive decisions | Roughly seven of every ten positive decisions would occur on sessions later reported as aligned |

The confusion matrix at threshold `0.3626` was: 23 true positives, 53 false positives, 89 true negatives, and 28 false negatives. Accuracy was `58.0%`, which is below the `73.6%` majority-class accuracy because the chosen threshold intentionally sacrifices accuracy to detect more drift sessions. This is why accuracy alone is not an appropriate model-selection metric for this imbalanced outcome.

## Interpretation

The model shows modest discrimination, and its confidence interval includes chance-level performance. The task-site baseline also produced a numerically higher holdout ROC-AUC of 0.596, although model selection was correctly based on development results rather than the holdout.

The appropriate conclusion is that the current full-session activity features do not demonstrate clear predictive enrichment over simpler baselines. The result is still useful as an honest feasibility finding and as evidence that grouped validation, uncertainty, and false-positive burden matter when evaluating reflective-intervention models.

This artifact is valid for session-end research analysis. It should not be presented as a validated 3-, 5-, or 10-minute predictor, and its probability must not replace the participant's explicit reflection response.

## Output files

- `full_session_model.json`: portable model and preprocessing parameters
- `full_session_model.joblib`: fitted Python pipeline
- `full_session_model_comparison.csv`: baseline and model results
- `full_session_calibration.csv`: predicted versus observed risk bins
- `full_session_coefficients.csv`: fitted coefficient ranking
- `full_session_test_vectors.json`: shared probability-verification cases
- `FULL_SESSION_MODEL_CARD.md`: intended use and limitations
