import type { SourceLocation } from '@shared/messages';

// Universal source-location fallback: when Angular's class debug info isn't
// present in the build (many webpack/Nx setups strip `ɵsetClassDebugInfo`), the
// served bundles almost always still ship source maps with `sourcesContent`.
// We fetch those maps, scan the original source for class declarations, and
// build a `className -> { file, line }` index. This is the same data DevTools
// uses for the Sources panel, so it works in any Angular build that emits
// source maps — with or without Nx.

const CLASS_DECL = /(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+([A-Za-z_$][\w$]*)/g;
const RESCAN_THROTTLE_MS = 3000;

const index = new Map<string, SourceLocation>();
const rankByName = new Map<string, number>();
const indexedUrls = new Set<string>();
let scanning = false;
let lastScan = 0;

interface RawSourceMap {
  sources?: string[];
  sourcesContent?: (string | null)[];
}

/** Look up a component's source by its class name. Null until the relevant
 * bundle's map has been indexed (indexing is async). */
export function resolveFromSourceMap(className: string): SourceLocation | null {
  return index.get(className) ?? null;
}

/** Kick off (or refresh) indexing of any not-yet-seen same-origin scripts.
 * Cheap and throttled, so it's safe to call on every report tick — this is how
 * lazily-loaded route/MFE chunks get picked up after navigation. */
export function refreshSourceMapIndex(force = false): void {
  const now = Date.now();
  if (scanning) return;
  if (!force && now - lastScan < RESCAN_THROTTLE_MS) return;
  lastScan = now;
  scanning = true;
  void scanNewScripts().finally(() => {
    scanning = false;
  });
}

async function scanNewScripts(): Promise<void> {
  const urls = collectScriptUrls().filter((u) => !indexedUrls.has(u));
  for (const u of urls) indexedUrls.add(u); // claim up-front so concurrent calls don't duplicate
  await Promise.all(urls.map(indexScript));
}

function collectScriptUrls(): string[] {
  const set = new Set<string>();
  for (const s of Array.from(document.scripts)) {
    if (s.src) set.add(s.src);
  }
  for (const e of performance.getEntriesByType('resource')) {
    const url = (e as PerformanceResourceTiming).name;
    if (/\.[mc]?js(\?|$)/.test(url)) set.add(url);
  }
  return Array.from(set).filter(isSameOrigin);
}

function isSameOrigin(url: string): boolean {
  try {
    return new URL(url, location.href).origin === location.origin;
  } catch {
    return false;
  }
}

async function indexScript(url: string): Promise<void> {
  try {
    const res = await fetch(url, { cache: 'force-cache' });
    if (!res.ok) return;
    const text = await res.text();
    const map = await loadSourceMap(url, text);
    const sources = map?.sources;
    const contents = map?.sourcesContent;
    if (!sources || !contents) return;
    for (let i = 0; i < contents.length; i++) {
      const content = contents[i];
      const file = sources[i];
      if (content && file) indexContent(normalizeSource(file), content);
    }
  } catch {
    // CORS (cross-origin MFE chunk), network error, or non-JS — skip silently.
  }
}

async function loadSourceMap(scriptUrl: string, scriptText: string): Promise<RawSourceMap | null> {
  // The sourceMappingURL comment lives at the end of the file.
  const tail = scriptText.slice(-4096);
  const m = /[#@]\s*sourceMappingURL=(\S+)/.exec(tail);
  if (!m) return null;
  const ref = m[1];

  if (ref.startsWith('data:')) {
    const comma = ref.indexOf(',');
    if (comma === -1) return null;
    const payload = ref.slice(comma + 1);
    const json = ref.slice(0, comma).includes('base64') ? decodeBase64Utf8(payload) : decodeURIComponent(payload);
    return json ? (JSON.parse(json) as RawSourceMap) : null;
  }

  const mapUrl = new URL(ref, scriptUrl).href;
  if (!isSameOrigin(mapUrl)) return null;
  const res = await fetch(mapUrl, { cache: 'force-cache' });
  if (!res.ok) return null;
  return (await res.json()) as RawSourceMap;
}

function decodeBase64Utf8(b64: string): string | null {
  try {
    const bin = atob(b64);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

function indexContent(file: string, content: string): void {
  const rank = fileRank(file);
  CLASS_DECL.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = CLASS_DECL.exec(content)) !== null) {
    const name = m[1];
    // A class name can appear in several maps (real `.ts` source plus compiled
    // `.mjs`/vendor artifacts). Keep the best-ranked file so we open the actual
    // source, not a build output.
    const prev = rankByName.get(name);
    if (prev !== undefined && prev <= rank) continue;
    rankByName.set(name, rank);
    index.set(name, { file, line: lineOf(content, m.index) });
  }
}

// Lower is better: prefer original TypeScript source under a project `src/`,
// penalize compiled outputs (.mjs/.js), vendored code, and build artifacts.
function fileRank(file: string): number {
  let r = 0;
  if (!/\.tsx?$/.test(file)) r += 100;
  if (/(^|\/)node_modules\//.test(file)) r += 50;
  if (/(^|\/)(dist|\.angular|out-tsc|tmp)\//.test(file)) r += 20;
  if (/\.(mjs|cjs)$/.test(file)) r += 10;
  if (!/(^|\/)src\//.test(file)) r += 5;
  return r;
}

function lineOf(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset; i++) {
    if (text.charCodeAt(i) === 10) line++;
  }
  return line;
}

/** Reduce a source-map `sources` entry to a project-relative path the editor can
 * resolve once the workspace root is prepended, e.g.
 * `webpack:///apps/os/shell/src/app/header/header.component.ts` -> `apps/os/.../header.component.ts`. */
function normalizeSource(src: string): string {
  let s = src;
  s = s.replace(/^webpack-internal:\/\/\//, '');
  s = s.replace(/^webpack:\/\/\/?/, '');
  s = s.replace(/^[^/]*\/\.\//, ''); // strip a leading "<namespace>/./" segment
  s = s.replace(/^\.?\//, ''); // strip leading "./" or "/"
  return s;
}
