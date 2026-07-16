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

- [ ] A monitored page path and query never appear in extension storage or exports.
- [ ] Keyboard values are not read, logged, messaged, or exported.
- [ ] Page titles and page text do not appear in storage or exports.
- [ ] Passwords, private messages, screenshots, and source code are not collected.
- [ ] Video state is represented only as a boolean or aggregate seconds.
- [ ] Every activity window references a valid anonymous session ID.

## Participant Control

- [ ] Consent text matches the implemented fields.
- [ ] The anonymous participant code contains no name or email.
- [ ] Pause prevents new collection.
- [ ] Per-session deletion removes linked activity windows.
- [ ] Delete-all removes all sessions and activity windows.
- [ ] CSV and JSON exports contain only documented allowlisted fields.

## Study Interpretation

- [ ] Labels are described as self-report.
- [ ] Missing, continued, and deferred outcomes are not coded as non-drift.
- [ ] Dashboard text makes no claim about attention, addiction, diagnosis, emotion, or general productivity.
- [ ] No model-risk language appears in this data-collection-only build.
