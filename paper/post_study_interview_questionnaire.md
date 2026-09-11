# DriftSense Phase 1 and Phase 2 Interview Guide

Use this guide at two points:

1. **After Phase 1:** a short check about data collection, usability, and privacy.
2. **After Phase 2:** the main interview about the ML-triggered beep experience.

Phase 1 collected permitted browser-activity and session data. It did not use
ML predictions or provide mid-session beeps. Phase 2 is the main study phase
for this interview.

Estimated time:

- After Phase 1: 3–5 minutes
- After Phase 2: 10–15 minutes

## Interviewer instructions

- Use the same anonymous participant ID in both phases.
- Ask questions in the listed order.
- Do not suggest that a positive or negative answer is expected.
- Use neutral follow-ups, such as: “Could you tell me more about that?”
- Do not ask for page content, messages, source code, search queries, or names of
  sites visited outside the participant-approved task-site set.
- Record `not applicable`, `not sure`, and missing responses separately.
- Do not tell participants that the model knows whether they are drifting.

## Agreement scale

Use this scale for every agreement statement:

1. Strongly disagree
2. Disagree
3. Neither agree nor disagree
4. Agree
5. Strongly agree

---

## Consent before participation

Complete the approved consent process before Phase 1. Record each required item
as `Yes` or `No`.

1. The participant has read or received an explanation of the study.
2. The participant understands what they will be asked to do.
3. The participant understands what DriftSense will and will not record.
4. The participant understands that participation is voluntary and may be
   stopped without giving a reason.
5. The participant understands how anonymized study data may be used.
6. The participant had an opportunity to ask questions.
7. The participant agrees to participate.

Do not begin Phase 1 unless all required consent items are answered `Yes`.

## Brief participation confirmation

- Anonymous participant ID: ____________________
- Consent date: ____________________
- Meets the minimum age in the approved ethics protocol: `Yes` / `No`
- Can use the required browser and study device: `Yes` / `No`
- Understands the study instructions: `Yes` / `No`
- Agrees to begin Phase 1: `Yes` / `No`
- Researcher initials or code: ____________________

Do not store participant names or signatures in the research-response dataset
unless required by the approved ethics protocol.

---

## A. After Phase 1: brief data-collection check

### Participant introduction

“During Phase 1, DriftSense collected permitted session and browser-activity
information and asked for an end-of-session response. It did not use ML
predictions or provide mid-session beeps. These questions are about the data
collection experience.”

### A1. Agreement statements

1. DriftSense was easy to use during Phase 1.
2. Starting and ending a session was clear.
3. The end-of-session question was easy to understand.
4. I was comfortable with the information DriftSense recorded.
5. Phase 1 added effort to my normal browser use.

### A2. Short questions

1. Was anything confusing or difficult during Phase 1?
2. Did the end-of-session question make sense to you?
3. What should be improved in the data-collection process?

Do not interpret Phase 1 responses as evidence that DriftSense improved
attention or reduced drift. Phase 1 primarily assessed and collected data for
model development.

---

## B. After Phase 2: main interview

### Participant introduction

“During Phase 2, DriftSense used an ML model to decide whether to provide a
mid-session reflective beep. Some sessions may not have produced a beep.
Please answer from what you personally remember experiencing.”

### B1. Beep-exposure check

1. Do you remember hearing at least one DriftSense beep during Phase 2?
   - Yes
   - No
   - Not sure

2. Do you remember hearing the ESP32 beep?
   - Yes
   - No
   - Not sure

If the participant answers `No` or `Not sure` to Question 1, record beep-specific
statements B2.4–B2.9 as `not applicable`. Do not ask the participant to imagine
how a beep might have felt.

### B2. Agreement statements

All participants answer Statements 1–3 and 10. Participants who remember a
beep also answer Statements 4–9.

1. DriftSense was easy to use during Phase 2.
2. I was comfortable with the information DriftSense recorded.
3. Phase 2 added effort to my normal browser use.
4. The beeps occurred at appropriate times.
5. The beeps occurred when I needed to reconsider whether I was following my
   intended task.
6. The beeps helped me reflect on my current browser activity.
7. The beeps helped me return to my intended task when I wanted to.
8. The beeps interrupted activity that was useful for my intended task.
9. The beeps were annoying.
10. I preferred the Phase 2 experience to the Phase 1 experience.

### B3. Main Phase 2 interview questions

Ask Questions 1–6 only if the participant remembers hearing a beep. Ask
Questions 7–8 of every participant.

1. What did you usually do immediately after a beep?
2. Can you describe a time when a beep felt useful or correctly timed?
3. Can you describe a time when a beep felt unnecessary, incorrect, or
   disruptive?
4. How did the beep affect your decision to continue or change your current
   activity?
5. How did the ESP32 beep affect your experience?
6. Were the beeps too frequent, not frequent enough, or about right? Why?
7. What should be improved about Phase 2?
8. Which version would you choose—Phase 1, Phase 2, or neither—and why?

### Optional neutral follow-ups

- “What made that beep useful or unhelpful?”
- “What happened next?”
- “Was that activity still related to your intended task?”
- “How would you change the timing or presentation?”

---

## Recording and analysis guidance

- Use extension audit records—not participant memory—for the actual number and
  timing of beeps.
- Report response counts and percentages for each option.
- Report the median and interquartile range for each agreement statement.
- Keep `not applicable`, `not sure`, missing, and no-beep responses separate.
- Report beep timing, helpfulness, interruption, and annoyance separately.
- Compare Phase 1 and Phase 2 only on matched usability, effort, privacy, and
  preference questions.
- Treat Phase 1–Phase 2 differences as perceived or descriptive differences,
  not causal effects.
- Summarize open-ended responses using anonymous participant IDs and a documented
  coding process.
- Do not interpret browser activity, a hostname, or an ML score as objective
  evidence of attention or productivity.
- Digital drift remains the participant-reported mismatch between their browser
  activity and their own intended task.
