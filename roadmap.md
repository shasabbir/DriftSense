# DriftSense Study Roadmap

## Research Direction

DriftSense studies whether a privacy-preserving browser model can predict
self-reported intention drift and whether a lightweight reflective prompt can
reduce drift in sessions that the frozen model classifies as elevated risk.

The study has two research questions:

1. Can declared intention plus lightweight activity predict self-reported drift
   better than time and domain baselines?
2. Among elevated-risk sessions, does a reflective prompt reduce subsequent
   self-reported drift compared with a randomized silent control?

The project does not detect attention, emotion, addiction, ADHD, mental health,
or productivity. A long session is not automatically harmful, and a monitored
domain is not automatically distracting.

## Final Study Design

Use one cohort for 17 active study days.

### Participants

- Target: 20 completers.
- Recruit: 22-24 adults to allow for attrition.
- Population: adult Chrome or Chromium users who regularly visit at least two
  domains they are willing to monitor.
- Do not recruit using clinical or diagnostic categories.

### Phase 1: Ten-Day Collection

For every monitored-domain session:

1. Ask for declared intention and optional intended duration.
2. Record allowlisted aggregate activity and 10-second activity windows.
3. Ask the same post-session intention-alignment question.
4. Show no model-assisted mid-session prompt.

Target at least 500 complete binary-labeled sessions overall and, where normal
browsing frequency permits, at least 20 labeled sessions per participant.
These are feasibility targets, not powered sample-size guarantees.

### Model-Development Interval

Keep the primary model deliberately simple:

1. time-threshold baseline;
2. domain baseline fitted on training data;
3. intention-only logistic regression;
4. activity-only logistic regression;
5. intention-plus-activity logistic regression; and
6. optional Random Forest as an offline robustness comparison.

Use Phase 1 days 1-7 for development and days 8-10 as a chronological holdout.
Use participant-grouped folds within development data and report a separate
participant-held-out estimate when the data permits. Never randomly mix sessions
from the same participant across ordinary row-level train and test sets.

Evaluate one-, three-, and five-minute features and full-session features. The
intervention uses only the frozen three-minute model. Early features must contain
only observations available by their cutoff.

Freeze before Phase 2:

- preprocessing parameters;
- feature order;
- logistic-regression coefficients and intercept;
- model version;
- risk threshold;
- 0.5 randomization probability; and
- prompt cap.

### Phase 2: Seven-Day Micro-Randomized Intervention

Keep intention collection, activity measurement, session boundaries, dashboard
availability, and post-session reflection identical to Phase 1.

At three minutes:

1. Compute local risk using the frozen model.
2. Check the threshold, required features, and prompt cap.
3. For an eligible session, assign with equal probability:
   - reflective prompt; or
   - silent control.
4. Log assignment before rendering the prompt.
5. Ask both assignments the same post-session reflection.

Prompt text:

> Still here for your original reason?

Actions:

- Continue intentionally
- Finish now

Do not display a risk percentage or tell the participant that drift has been
detected. Show at most one prompt per session and no more than three prompts per
participant day.

Target at least 100 randomized elevated-risk sessions overall. If eligible
sessions are sparse, report the intervention as a technical feasibility pilot.

## Required Data

### Primary Participant CSV

The extension exports one file such as `P01.csv` with:

```text
session_id
participant_id
start_time
domain
declared_intention
intended_duration_minutes
duration_seconds
click_count
scroll_count
keyboard_activity_count
idle_seconds
focus_loss_count
drift_label
```

### Activity-Window CSV

Ten-second windows provide the time-truncated features required for prediction
at one, three, and five minutes. Never construct an early predictor from final
session totals.

### Phase 2 Intervention Log

Store a separate allowlisted record keyed by `session_id`:

```text
model_version
prediction_offset_seconds
risk_probability
risk_threshold
eligible
randomized_assignment
prompt_shown
prompt_response
suppression_reason
```

Keep all real exports in a private, access-controlled directory outside the
repository.

## Evaluation

### Prediction

Report:

- accuracy;
- precision;
- recall;
- F1-score;
- ROC-AUC;
- confusion matrix;
- class distribution;
- one-, three-, and five-minute and full-session results; and
- same-participant chronological and participant-held-out results separately.

The main prediction comparison is intention-plus-activity logistic regression
against time and domain baselines. Intention-only and activity-only models show
the incremental value of each feature group.

### Prompt Effect

The primary outcome is the binary post-session drift proportion among randomized
eligible sessions.

For each participant with both assignments:

1. Calculate drift proportion under reflective-prompt assignment.
2. Calculate drift proportion under silent-control assignment.
3. Compare paired proportions with a Wilcoxon signed-rank test.
4. Report the paired difference and a participant-bootstrap 95% confidence
   interval.
5. Report assignment-specific missing-label rates.

If the number of eligible sessions permits, add a mixed-effects logistic model
with participant random intercept as a sensitivity analysis.

Secondary outcomes:

- session duration after the three-minute assignment point;
- total session duration;
- immediate ending after a prompt;
- prompt response;
- prompt frequency and suppression;
- label completion; and
- short exit-survey responses.

Phase 1 versus Phase 2 differences are descriptive only. They are not the causal
test of the prompt because the phases occur in a fixed order.

## Exit Survey

Use five agreement items:

1. The prompts appeared at appropriate times.
2. The prompts helped me reconsider my intention.
3. The prompts were annoying.
4. The extension was easy to use.
5. I would continue using the extension.

Open question:

> What should be changed about the prompts or their timing?

## Execution Checklist

### Before Recruitment

- Obtain ethics approval or exemption.
- Finish and test the collector.
- Verify participant IDs, exports, and activity windows.
- Prepare consent, participant instructions, and a private transfer procedure.
- Pilot with the researcher for at least one day.

### After Phase 1

- Validate and combine private exports.
- Report missing labels and class balance.
- Train and evaluate the small model set.
- Freeze one three-minute model and threshold.
- Implement and test local inference, randomization, caps, and intervention logs.

### After Phase 2

- Validate session, window, and intervention files.
- Check assignment balance and missing outcomes.
- Run the prespecified prediction and intervention analyses.
- Add real results without altering hypotheses or hiding null findings.
- Report limitations, attrition, prompt burden, and uncertainty.

## Interpretation Boundary

A positive pilot may support this claim:

> DriftSense demonstrated the feasibility of privacy-preserving early prediction
> of self-reported browser-session drift, with preliminary short-term evidence
> about model-assisted reflective prompts from randomized eligible sessions.

Do not claim permanent behavior change, addiction reduction, mental-health
benefit, true attention detection, or general effectiveness beyond the study
sample. A seven-day intervention only supports a short-term conclusion.
