# DriftSense Export Schema

Schema version: `2`

All times use ISO 8601 strings. Durations use seconds unless the field explicitly says minutes. Binary drift labels come only from post-session self-report.

Domain categories describe sampling context only. Work, learning, social, video, and other categories may each contain aligned, drift, or unlabeled sessions.

## Primary participant CSV (`P01.csv`)

The dashboard's primary export uses the anonymous participant code as the
filename. For example, participant `P01` exports `P01.csv`. Assign a unique code
before collection; the extension locks the code after the first session is
stored.

| Field | Type | Meaning |
|---|---|---|
| `session_id` | string | Random session identifier |
| `participant_id` | string | Anonymous participant code, matching the filename |
| `start_time` | timestamp | Session creation time with timezone |
| `domain` | string | Configured hostname only |
| `declared_intention` | enum/null | Participant-selected neutral intended-activity category |
| `intended_duration_minutes` | integer/null | Participant-provided intended duration |
| `duration_seconds` | integer | Final observed session duration |
| `click_count` | integer | Aggregate click count |
| `scroll_count` | integer | Aggregate scroll-event count |
| `keyboard_activity_count` | integer | Keydown count without key values |
| `idle_seconds` | integer | Seconds in idle activity windows |
| `focus_loss_count` | integer | Count of tab focus departures |
| `drift_label` | 0/1/null | `0` aligned, `1` drift, blank for non-binary or missing reflection |

The primary export deliberately omits page content, full URLs, domain category,
condition bookkeeping, duplicated timestamps, and supporting activity-window
fields. Keep real participant exports in a private, consent-approved directory
outside the repository and run `python ml/combine_participant_csv.py --input
<private-directory> --output <private-directory>/data.csv` to produce the
combined modeling table. The combiner reports and excludes incomplete or
non-binary rows without changing the participant source files.

## Full session records in the optional JSON bundle

| Field | Type | Meaning |
|---|---|---|
| `sessionId` | string | Random UUID-based session identifier |
| `anonymousUserId` | string | Locally generated participant code |
| `studyStage` | string | `stage_1_training` in this build |
| `condition` | string | `static_intention_prompt` in this build |
| `domain` | string | Configured hostname only |
| `domainCategory` | enum | video, social, news, shopping, learning, work, or other |
| `declaredIntention` | enum/null | Participant-selected neutral intended-activity category |
| `intendedDurationMinutes` | integer/null | Participant-provided duration |
| `intentionCapturedAt` | timestamp/null | Time the intention was submitted |
| `startTime` | timestamp | Session creation time |
| `endTime` | timestamp/null | Completion, navigation, or closure time |
| `durationSeconds` | integer | Observed session duration |
| `clickCount` | integer | Aggregate click count |
| `scrollCount` | integer | Aggregate scroll event count |
| `keyboardActivityCount` | integer | Keydown count without key values |
| `idleSeconds` | integer | Seconds in idle activity windows |
| `activeSeconds` | integer | Seconds in focused, non-idle activity windows |
| `tabFocusLossCount` | integer | Count of tab focus departures |
| `tabSwitchCount` | integer | Count of tab switches away from the session |
| `videoPlayingSeconds` | integer | Seconds where an accessible video was playing |
| `checkinCount` | integer | Number of post-session reflection requests |
| `postSessionAnswer` | enum/null | Participant-selected reflection answer |
| `driftLabel` | 0/1/null | `0` aligned, `1` drift, null for non-binary or missing answer |
| `actualDurationSeconds` | integer | Final observed duration |
| `status` | enum | active, completed, or abandoned |
| `labelSource` | string/null | `post_session_self_report` when labeled |
| `createdAt` | timestamp | Record creation time |
| `updatedAt` | timestamp | Last record update time |

Internal fields such as Chrome tab ID, alarm state, and last-window bookkeeping are removed before export.

## Optional activity-windows CSV

| Field | Type | Meaning |
|---|---|---|
| `windowId` | string | Random UUID-based window identifier |
| `sessionId` | string | Parent session identifier |
| `anonymousUserId` | string | Locally generated participant code |
| `timestamp` | timestamp | End of the activity window |
| `timestampOffsetSeconds` | integer | Seconds since session start |
| `windowDurationSeconds` | integer | Window duration; fixed to 10 in this build |
| `clicksInWindow` | integer | Click count during the window |
| `scrollEventsInWindow` | integer | Scroll event count during the window |
| `keyboardActivityInWindow` | integer | Keydown count without key values |
| `idleInWindow` | boolean | Whether the idle threshold was reached |
| `tabFocused` | boolean | Whether the document was visible and focused |
| `videoPlaying` | boolean | Whether an accessible video element was playing |
| `urlDomainOnly` | string | Configured hostname only; no path or query |

## JSON Bundle

The bundle contains:

```json
{
  "schemaVersion": 2,
  "exportedAt": "ISO-8601 timestamp",
  "participantId": "P01",
  "studyStage": "stage_1_training",
  "condition": "static_intention_prompt",
  "sessions": [],
  "activityWindows": []
}
```

The JSON `sessions` array uses the full allowlisted camelCase session record
documented above. The `activityWindows` array uses the same allowlisted fields as
the optional activity-windows CSV. The JSON bundle is an audit/reproducibility
export rather than the primary modeling table.

## Intention Values

New schema-version-2 sessions use:

| Value | Display label |
|---|---|
| `work_or_study` | Work or study task |
| `learning_or_tutorial` | Learning or tutorial |
| `specific_information` | Specific information |
| `communication_or_community` | Communication or community |
| `planned_entertainment_or_break` | Planned entertainment or break |
| `open_ended_browsing` | Open-ended browsing |
| `accidental_open` | Opened accidentally |

These values describe intended activity and do not determine whether a session is drift. Existing pilot records may retain the retired schema-version-1 values `intentional_break`, `boredom`, `avoiding_work`, or `accidental_click`; the dashboard keeps readable labels for them, but they should not be mixed into the formal study dataset without an explicit preprocessing decision.

## Label Mapping

| Reflection answer | `driftLabel` | Treatment |
|---|---:|---|
| Yes, it matched | 0 | Binary non-drift/aligned outcome |
| No, I drifted | 1 | Binary drift outcome |
| Continue intentionally | null | Retained as a separate non-binary outcome |
| Save for later | null | Retained as a separate non-binary outcome |
| Missing reflection | null | Unlabeled; never treated as non-drift |

## Planned Phase 2 Intervention Log

The seven-day intervention build will export a separate allowlisted CSV rather
than changing the stable participant CSV. The planned fields are:

| Field | Meaning |
|---|---|
| `session_id` | Parent session identifier |
| `participant_id` | Anonymous participant code |
| `model_version` | Frozen local model identifier |
| `prediction_offset_seconds` | Fixed at 180 for the deployed model |
| `risk_probability` | Local model estimate used for eligibility |
| `risk_threshold` | Frozen eligibility threshold |
| `eligible` | Whether all intervention eligibility rules passed |
| `randomized_assignment` | `reflective_prompt`, `silent_control`, or blank when ineligible |
| `prompt_shown` | Whether the assigned prompt rendered successfully |
| `prompt_response` | `continue_intentionally`, `finish_now`, or blank |
| `suppression_reason` | Reason an otherwise evaluated session was not randomized or shown |
| `assigned_at` | Local ISO 8601 assignment timestamp |

Assignment must be stored before prompt rendering and must survive extension
suspension without rerandomization. The risk estimate remains an audit field and
is not shown to participants as proof of drift.
