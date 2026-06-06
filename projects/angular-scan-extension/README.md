# angular-scan-extension

Chrome / Edge MV3 extension that activates [`angular-scan`](../../README.md) on any Angular dev-mode page **without modifying the host app**.

> Status: **v0.1.0 — experimental**.

---

## Features

The main-world script reimplements the scanner core directly against `window.ng.*`, so the extension runs standalone — no host-app changes, no lib bundle required.

### Detection & control

- **Angular dev-mode detection** via `window.ng.ɵsetProfiler`. Popup status shows the exact mode: Angular version + `(dev)`, `Production build — scan unavailable`, `No Angular detected`, or `Detecting…`.
- **Per-origin enable/disable**, persisted in `chrome.storage.sync` — a site stays on/off across reloads and devices. Off by default; enable per site.
- **Toolbar action badge** reflects live state per tab: blank (no Angular), `PROD` (production build), `OFF` (detected, not enabled), `ON` (scanning, clean tick), or the **wasted-render count** in red when the last tick had unnecessary renders (capped at `999`).
- **Survives service-worker restarts** — tab detection/options mirrored into `chrome.storage.session` and rehydrated when the MV3 SW wakes.

### Visual overlay

- **Canvas flash overlay** painted over each rendering host: **yellow** = meaningful render (DOM changed), **red** = unnecessary/wasted render. Alpha fades over the flash duration.
- **Inline render-count badges** pinned to each host element, recomputed every frame so they track scroll. Show `renders` plus `(Nw)` when wasted > 0; badge color follows the last render kind (**orange** = render, **red** = wasted, **gray** = not yet rendered).
- **Top-layer promotion** — overlay uses the Popover API and periodically re-asserts itself so it stays above app dialogs/modals.
- Toggle overlay and badges independently; **flash duration slider** (100–2000 ms, default 500).

### Popup

- Live **tick stats**: Checks, Wasted, Tick ms.
- Settings: Flash overlay, Render badges, Log to console, flash-duration slider.
- **Component table** — Name, Renders, Wasted, Rate (renders/s over last 5 s), Peak (peak renders/s), Source. Sortable by any column; **wasted-heavy rows highlighted**.
- **Row → flash** the component on the page; **name → copy source path**.
- **Reset stats**, **↻ Refresh**, **📊 Report** (opens full reader), **JSON** / **CSV** export.

### Copy component source path

Click a component **name** to copy its source path
(`apps/os/shell/src/app/header/header.component.ts:12`) to the clipboard. Paste into
your editor's Quick-Open (`Cmd/Ctrl-P`) to jump to the file. Resolved from Angular's
class debug info when present, otherwise from the page's **source maps** (plain CLI,
webpack, Nx). Library components / builds without source info copy the class name.

### Report export

- **JSON** — `{ generatedAt, tabId, report: [...] }` envelope.
- **CSV** — `id,name,renders,wasted,rps5s,rpsPeak,sourceFile,sourceLine`, with spreadsheet **formula-injection neutralized** (leading `= + - @` prefixed with a tab).

### Report reader

Full-page viewer (`src/reader/reader.html`), opened from the popup's **📊 Report** button.

- **Live tab:** pick any tab where Angular Scan is active from the dropdown — its current report renders instantly. **↻ Refresh** re-reads; **Auto-refresh** polls every 1.5 s.
- **Upload file:** drop or browse to a `.json` / `.csv` report downloaded from the popup.
- **Summary cards:** components, total renders, total wasted, wasted %, peak rate, % with source.
- **Bars** for the 15 busiest components (good vs. wasted split), plus a **searchable, sortable table** with an "only wasted" filter. Click a name to copy its source path.

### Not yet

- Per-component inspector + DevTools panel
- Firefox manifest (needs `browser_specific_settings`)
- Heatmap mode, FPS, slow-interaction badge

---

## Build

```bash
pnpm install
pnpm build
```

Output goes to `dist/`.

## Load in Chrome

1. Visit `chrome://extensions`.
2. Toggle **Developer mode**.
3. Click **Load unpacked**, select `projects/angular-scan-extension/dist`.
4. Open any Angular dev app (e.g. `http://localhost:4200`).
5. Click the toolbar icon → toggle **Enable on this site**.

## Develop

```bash
pnpm dev
```

`@crxjs/vite-plugin` keeps the manifest hot-reloaded. Reload the unpacked extension after manifest changes.

## Icons

Source: `src/assets/icon-source.svg` (Angular shield + render-pulse). The generated
PNGs live in `src/assets/icons/` and are wired into `manifest.config.ts` (`icons` +
`action.default_icon`). To regenerate after editing the SVG, on macOS:

```bash
mkdir -p src/assets/icons
for s in 16 32 48 128; do
  qlmanage -t -s $s -o src/assets/icons src/assets/icon-source.svg >/dev/null 2>&1
  mv src/assets/icons/icon-source.svg.png src/assets/icons/$s.png
done
```

(or `rsvg-convert -w $s -h $s icon-source.svg -o icons/$s.png` if you have it.)

## Project layout

```
src/
├── background/        # service worker, tab state, badge
├── content/           # ISOLATED-world script that injects main-world
├── main-world/        # in-page scanner (uses window.ng.* directly)
├── popup/             # toolbar popup UI
├── shared/            # message types, settings, storage, detection
└── assets/            # SVG icon source
manifest.config.ts     # crxjs typed manifest builder
vite.config.ts         # vite + @crxjs
```

## Communication protocol

```
page MAIN  ──postMessage──▶  content ISOLATED  ──runtime.sendMessage──▶  background SW
              ◀──────────────                  ◀───────tabs.sendMessage────
                                                              ▲
                                                              │ popupQuery
                                                              │
                                                          popup UI
```

Page-bound envelope: `{ ns: 'angular-scan', dir: 'in' | 'out', cmd, payload?, id? }`.

## Compatibility notes

- Angular profiler event IDs hard-coded in `src/main-world/scanner.ts` match Angular **20+**. Different majors may renumber events; revalidate when bumping Angular.
- Dev mode only — `window.ng.ɵsetProfiler` is absent in production builds (this is a feature of Angular, not a bug here).
- Pages with strict `script-src` CSP may block `<script src="…main-world.js">` injection. v1 fallback (`chrome.scripting.executeScript({world:'MAIN'})`) is a TODO.

## License

Same as parent project.
