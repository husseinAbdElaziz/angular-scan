import { defineManifest } from '@crxjs/vite-plugin';
import pkg from './package.json' with { type: 'json' };

export default defineManifest({
  manifest_version: 3,
  name: 'Angular Scan',
  version: pkg.version,
  description: pkg.description,
  icons: {
    16: 'src/assets/icons/16.png',
    32: 'src/assets/icons/32.png',
    48: 'src/assets/icons/48.png',
    128: 'src/assets/icons/128.png',
  },
  action: {
    default_popup: 'src/popup/popup.html',
    default_title: 'Angular Scan',
    default_icon: {
      16: 'src/assets/icons/16.png',
      32: 'src/assets/icons/32.png',
      48: 'src/assets/icons/48.png',
      128: 'src/assets/icons/128.png',
    },
  },
  background: {
    service_worker: 'src/background/index.ts',
    type: 'module',
  },
  content_scripts: [
    // ISOLATED-world bridge: relays messages between the page and the background.
    // Declared first so its window 'message' listener is attached before the
    // MAIN-world script below starts emitting.
    {
      matches: ['<all_urls>'],
      js: ['src/content/index.ts'],
      run_at: 'document_start',
      all_frames: true,
    },
    // MAIN-world scanner: needs the page's real `window.ng`. Declared statically
    // (not injected via chrome.scripting) so it runs deterministically at
    // document_start on first load, including already-open tabs after install.
    {
      matches: ['<all_urls>'],
      js: ['src/main-world/index.ts'],
      run_at: 'document_start',
      all_frames: true,
      world: 'MAIN',
    },
  ],
  permissions: ['storage'],
  host_permissions: ['<all_urls>'],
});
