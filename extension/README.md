# DriftSense Data-Collection Extension

DriftSense is a local-first Chrome Manifest V3 research extension for collecting intention-labeled browser sessions. This build implements data collection only. It does not run a drift-prediction model or show model-assisted interventions.

## Included

- consent-led onboarding and anonymous participant ID
- optional per-domain Chrome permissions
- editable monitored-domain list and categories
- pre-session intention prompt with intended duration
- privacy-safe 10-second activity windows
- post-session self-report and label mapping
- local session and activity-window storage
- popup for collection state and active-session reflection
- dashboard for delayed summaries, intention alignment, session inspection, export, and deletion
- CSV and JSON export through an explicit user action
- synthetic dashboard records available only in Vite development mode

## Privacy Boundary

DriftSense collects only the configured hostname, timestamps, aggregate click/scroll/keyboard-activity counts, idle/focus state, accessible video-playing status, declared intention, intended duration, and post-session reflection. Keyboard events are counted without reading or storing key values.

It does not collect page paths, query strings, page titles, page text, passwords, messages, screenshots, source code, full browsing history, webcam data, identity, emotion, or clinical information. Export records pass through an explicit field allowlist in `src/shared/privacyGuard.ts`.

## Install for Development

Requirements: Node.js 20 or newer and a current Chrome or Chromium browser.

```powershell
cd extension
npm install
npm test
npm run build
```

Then load the production bundle:

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Select **Load unpacked**.
4. Choose `extension/dist`.
5. Pin DriftSense from the extensions menu.
6. Complete the consent and monitored-domain setup page that opens automatically.

After source changes, run `npm run build`, then select **Reload** on the DriftSense card in `chrome://extensions`.

## Development Commands

```powershell
npm run dev        # Vite UI development server
npm run typecheck  # TypeScript validation
npm test           # privacy, labels, domains, permissions, and synthetic data
npm run build      # production unpacked extension in dist/
```

The icon source is deterministic. Regenerate the PNG sizes with:

```powershell
.\scripts\generate-icons.ps1
```

## First Pilot Walkthrough

1. Complete consent and approve access only to the selected monitored domains.
2. Set the fallback reflection time to one minute for a short test.
3. Open an enabled domain in a new tab.
4. Select an intention and intended visit length.
5. Click, scroll, or type normally. Only aggregate counts are retained.
6. Wait for the reflection prompt, or choose **End and reflect** from the popup.
7. Submit a reflection and inspect the session in the dashboard.
8. Export `sessions.csv`, `activity-windows.csv`, and the JSON bundle.
9. Verify that exported URL data contains hostnames only.

Closing or navigating away from a session before reflection preserves it as an unlabeled, abandoned session. It is not silently treated as non-drift.

## Architecture

```text
src/background/   service worker, session lifecycle, alarms, aggregation
src/content/      intention/reflection overlay and activity-window counter
src/popup/        compact collection status and active-session controls
src/options/      consent, domain permissions, timing, and privacy settings
src/dashboard/    delayed summaries, records, export, and deletion
src/shared/       types, storage, labels, permissions, privacy guard
src/ui/           shared visual system and formatting
```

`chrome.storage.local` is the source of truth. The service worker reconstructs state from storage after suspension, and the collector is dynamically registered only on enabled domains for which the participant granted Chrome host access.

## Current Scope

This version supports the Stage 1 static intention-prompt collection protocol. Passive-baseline scheduling, ML inference, risk estimates, and model-assisted check-ins are intentionally reserved for the next implementation phase.

See [docs/data-schema.md](docs/data-schema.md) for exact exports and [docs/privacy-checklist.md](docs/privacy-checklist.md) before beginning a participant pilot.
