# Pilot Privacy Checklist

Complete this checklist before collecting participant data.

## Build and Permissions

- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] Chrome requests access only to domains selected during onboarding.
- [ ] Disabled and removed domains no longer retain host permission.
- [ ] Monitoring is off before consent and can be paused immediately.
- [ ] No external analytics, API endpoint, or remotely hosted code is present.

## Collected Data

- [ ] A task-site page path and query never appear in extension storage or exports.
- [ ] Outside-site destinations never appear in storage or exports; only aggregate away seconds are retained.
- [ ] Keyboard values are not read, logged, messaged, or exported.
- [ ] Page titles and page text do not appear in storage or exports.
- [ ] Passwords, private messages, screenshots, and source code are not collected.
- [ ] Video state is represented only as a boolean or aggregate seconds.
- [ ] Every activity window references a valid anonymous session ID.

## Participant Control

- [ ] Consent text matches the implemented fields.
- [ ] The anonymous local ID is generated automatically and contains no name or email.
- [ ] Pause prevents new collection.
- [ ] Per-session deletion removes linked activity windows.
- [ ] Delete-all removes all sessions and activity windows.
- [ ] Participant CSV, activity-window CSV, and JSON exports contain only documented allowlisted fields.
- [ ] Onboarding never asks the participant to create or enter an identifier.

## Study Interpretation

- [ ] Every session begins through an explicit participant action on an approved task site.
- [ ] Closing, navigating, or reaching the intended duration does not silently end or label a session.
- [ ] A pending post-session reflection survives popup closure and remains recoverable.
- [ ] The participant-approved task-site set may include mixed-use sites when relevant.
- [ ] Domain categories are treated as context only and never used as ground-truth drift labels.
- [ ] Structured task types use neutral language and no free-text task description is collected.
- [ ] Labels are described as self-report.
- [ ] `not_sure`, missing, and action-only outcomes are not coded as non-drift.
- [ ] Dashboard text makes no claim about attention, addiction, diagnosis, emotion, or general productivity.
- [ ] No model-risk language appears in this data-collection-only build.

## Phase 1 Protocol Checks

- [ ] Ten-second activity rows are accepted only from focused approved task-site tabs.
- [ ] 3-, 5-, and 10-minute features can be reconstructed without post-cutoff fields.
- [ ] Intended duration is stored as context and never schedules a reflection.
- [ ] No model, risk score, eligibility decision, or mid-session reflective prompt is active.
