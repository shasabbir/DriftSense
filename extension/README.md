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

## ESP32 USB serial prototype

The ESP32 integration is intentionally simple: keep the browser extension as the
source of truth and use the ESP32 only for three buttons, a 16x2 LCD countdown,
red LED, and buzzer output.

For automatic Phase 2 alerts, copy the validated checkpoint artifact generated
by `ml/model_development.py` to `public/models/frozen_model.json` before the
build. The extension fails closed and records `model_unavailable` when this
file is absent; the full-session model is never used for a mid-session alert.

The device page writes a short-lived USB connection heartbeat. If an
intervention is assigned while that heartbeat is missing, DriftSense shows a
neutral Chrome check-in notification and records `browser_notification` as the
delivery channel instead of claiming ESP32 delivery.

1. Upload [`../hardware/esp32_usb_serial/esp32_usb_serial.ino`](../hardware/esp32_usb_serial/esp32_usb_serial.ino) to the ESP32.
2. Build and load the extension from `dist/`.
3. Open the popup and choose **ESP32 device**.
4. Connect the board with a USB data cable.
5. Click **Connect ESP32** and choose the ESP32 serial port.
6. Select a task type in the device page, focus an approved task-site tab, then use the hardware buttons.

Button mapping:

| State | Button 1 | Button 2 | Button 3 |
|---|---|---|---|
| Idle | Start setup/reset | Add 10 minutes | - |
| Selecting duration | Reset to 0 | Add 10 minutes | Start task |
| Running | - | - | Finish and reflect |
| Reflection | Aligned | Moved away | Not sure |

The serial protocol is newline-delimited text. The ESP32 sends `BUTTON:1`,
`BUTTON:2`, or `BUTTON:3`; the extension sends commands such as `DURATION:30`,
`START`, `TIME:1785`, `REFLECTION`, and `COMPLETE`.

The current implementation does not use the session-end JSON model for hardware
alerts. Early alerting still requires a separately trained and frozen checkpoint
model before Phase 2.
