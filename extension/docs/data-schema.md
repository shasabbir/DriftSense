# Phase 1 data schema

Schema version: `3`

Real participant exports must remain outside the repository and Git history.

## Session export

The primary modeling CSV contains one row per explicitly started task session:

| Field | Meaning |
|---|---|
| `session_id` | Random local session identifier |
| `participant_id` | Random anonymous local ID generated automatically by the extension |
| `start_time` | ISO task-start timestamp |
| `task_type` | One of the six structured task types |
| `intended_duration_minutes` | Participant estimate; context only |
| `initial_task_site` | Approved hostname where the task began |
| `task_site_count` | Number of approved task sites snapshotted at start |
| `duration_seconds` | Elapsed time frozen when reflection was requested |
| `click_count` | Aggregate focused task-site clicks |
| `scroll_count` | Aggregate focused task-site scroll events |
| `keyboard_activity_count` | Count only; no key values |
| `idle_seconds` / `active_seconds` | Aggregate focused task-site state |
| `away_seconds` | Aggregate time outside the approved task-site set; no destination identity |
| `tab_switch_count` | Tab activation changes during the task |
| `video_playing_seconds` | Accessible playback state duration |
| `post_session_answer` | `aligned`, `moved_away`, `not_sure`, or blank |
| `drift_label` | `0`, `1`, or blank according to the explicit self-report |

The JSON session audit record additionally includes protocol/study identifiers, the snapshotted `taskSites` allowlist, reflection state/action, label source, timestamps, and status. Service-worker-only tab and context bookkeeping is excluded.

## Activity-window export

Each accepted row represents a focused 10-second window on a participant-approved task site:

`windowId`, `sessionId`, `anonymousUserId`, `timestamp`, `timestampOffsetSeconds`, `windowDurationSeconds`, `clicksInWindow`, `scrollEventsInWindow`, `keyboardActivityInWindow`, `idleInWindow`, `tabFocused`, `videoPlaying`, `taskSiteHostname`.

Rows from unapproved sites and unfocused tabs are rejected. Activity at 3, 5, and 10 minutes must be derived only from rows whose observed offsets fall at or before the relevant cutoff.

## Checkpoint export

The extension schedules snapshots at 180, 300, and 600 seconds. Each row stores its cutoff, capture time, observability, cumulative activity derived only from windows at or before that cutoff, and away/tab-switch features derived only from timestamped context transitions at or before the cutoff. A delayed service-worker alarm therefore cannot add post-cutoff activity.

## Label rules

- `aligned` -> `0`
- `moved_away` -> `1`
- `not_sure`, missing, or action-only -> unlabeled

An intended duration, hostname, activity pattern, dismissal, or missing answer never supplies a drift label.

## Prohibited data

Exports must not contain page text/title, URL paths or queries, free-text task content, passwords, messages, screenshots, source code, key values, browsing history, outside-site destination identity, webcam/face data, emotion, or inferred mental state.
