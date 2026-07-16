import { defineManifest } from '@crxjs/vite-plugin'
import packageJson from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'DriftSense',
  short_name: 'DriftSense',
  version: packageJson.version,
  description: 'Privacy-preserving, intention-aware browser session data collection for research.',
  minimum_chrome_version: '111',
  permissions: ['storage', 'tabs', 'idle', 'alarms', 'unlimitedStorage', 'sidePanel', 'scripting'],
  optional_host_permissions: ['http://*/*', 'https://*/*'],
  background: {
    service_worker: 'src/background/serviceWorker.ts',
    type: 'module',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'DriftSense',
    default_icon: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
    },
  },
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
  },
  options_page: 'src/options/index.html',
  side_panel: {
    default_path: 'src/dashboard/index.html',
  },
  content_scripts: [
    {
      // CRXJS emits the bundled collector from this inert declaration. The
      // service worker registers that bundle only on user-approved domains.
      matches: ['https://driftsense.invalid/*'],
      js: ['src/content/contentEntry.tsx'],
      run_at: 'document_idle',
    },
  ],
  web_accessible_resources: [],
})
