# DriftSense Export Schema

Schema version: `1`

All times use ISO 8601 strings. Durations use seconds unless the field explicitly says minutes. Binary drift labels come only from post-session self-report.

## sessions.csv

| Field | Type | Meaning |
|---|---|---|
| `sessionId` | string | Random UUID-based session identifier |
| `anonymousUserId` | string | Locally generated participant code |
| `studyStage` | string | `stage_1_training` in this build |
| `condition` | string | `static_intention_prompt` in this build |
| `domain` | string | Configured hostname only |
| `domainCategory` | enum | video, social, news, shopping, learning, work, or other |
| `declaredIntention` | enum/null | Participant-selected pre-session intention |
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

## activity-windows.csv

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
  "schemaVersion": 1,
  "exportedAt": "ISO-8601 timestamp",
  "participantId": "DS-...",
  "studyStage": "stage_1_training",
  "condition": "static_intention_prompt",
  "sessions": [],
  "activityWindows": []
}
```

The arrays use the same allowlisted fields as their CSV counterparts.

## Label Mapping

| Reflection answer | `driftLabel` | Treatment |
|---|---:|---|
| Yes, it matched | 0 | Binary non-drift/aligned outcome |
| No, I drifted | 1 | Binary drift outcome |
| Continue intentionally | null | Retained as a separate non-binary outcome |
| Save for later | null | Retained as a separate non-binary outcome |
| Missing reflection | null | Unlabeled; never treated as non-drift |
