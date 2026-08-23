# DriftSense extension

This Chrome Manifest V3 build implements Phase 1 observational data collection. It does not run a prediction model or show a model-assisted mid-session prompt.

## Phase 1 flow

1. The participant records consent; the extension generates a random anonymous local ID automatically.
2. The participant enables hostnames they use for planned browser tasks. These are task sites, not productive-site classifications.
   A new hostname can also be approved directly from the popup with **Add this domain**; Chrome still asks for host permission.
3. On an approved task site, the participant opens the extension popup, selects one structured task type and an intended duration, and explicitly starts the task.
4. The task may continue across any enabled task site. DriftSense stores 10-second, content-free activity windows only while an approved task-site tab is focused and creates leakage-safe snapshots at 3, 5, and 10 minutes.
5. Time outside the approved set is stored only as aggregate away seconds. Destination identity is never stored.
6. Intended duration is context only. The participant chooses **Finish and reflect** at the real task boundary.
7. The pending reflection remains recoverable in the popup until answered. `Aligned` maps to `0`, `No, I moved away` maps to `1`, and `Not sure` remains unlabeled.

Only one task session can be open at a time. Closing or navigating away from a tab does not silently end or label the task.

## Privacy boundary

Collected fields include the participant-approved task-site hostname, structured task type, intended duration, timing, aggregate clicks/scrolls/keyboard-activity counts, idle/active state, tab switches, aggregate away time, accessible video state, and post-session self-report.

The extension does not collect page titles, paths, query strings, text, free-text task descriptions, key values, passwords, messages, screenshots, source code, full browsing history, or destination hostnames outside the approved task-site set.

## Development

```bash
npm install
npm test
npm run build
```

Load `dist/` as an unpacked extension after building. Chrome may require reloading already-open task-site tabs after host permissions or the extension build changes.

## Manual pilot check

1. Complete onboarding and enable at least two relevant task sites. The extension generates its anonymous local ID automatically.
2. Open an enabled site and start a task from the popup.
3. Interact normally and move between enabled task sites and an outside site.
4. Return to the popup, finish the task, close and reopen the popup, and verify the reflection remains available.
5. Record each of the three reflection outcomes across isolated test sessions.
6. Export the session CSV, activity-window CSV, checkpoint CSV, and JSON audit bundle.
7. Verify activity rows are 10 seconds, checkpoint offsets contain no future activity, and outside destinations never appear.

See [docs/data-schema.md](docs/data-schema.md) and [docs/privacy-checklist.md](docs/privacy-checklist.md) before a participant pilot.
