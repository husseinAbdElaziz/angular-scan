import { DEFAULT_OPTIONS, type DetectionState, type ScanOptions, type TickSummary } from '@shared/settings';

export interface TabState {
  tabId: number;
  host: string | null;
  detected: DetectionState;
  options: ScanOptions;
  lastSummary?: TickSummary;
}

// The MV3 service worker is terminated after ~30s idle, which wipes this Map and
// would otherwise lose detection/options mid-session. Mirror every tab's state
// into chrome.storage.session (in-memory, survives SW restarts, cleared when the
// browser closes) and rehydrate the Map the first time the SW wakes.
const tabs = new Map<number, TabState>();
const keyFor = (tabId: number): string => `tab:${tabId}`;

let hydration: Promise<void> | null = null;

export function hydrate(): Promise<void> {
  if (!hydration) hydration = doHydrate();
  return hydration;
}

async function doHydrate(): Promise<void> {
  try {
    const all = await chrome.storage.session.get(null);
    for (const [key, value] of Object.entries(all)) {
      if (!key.startsWith('tab:') || !value || typeof value !== 'object') continue;
      const state = value as TabState;
      if (typeof state.tabId === 'number' && !tabs.has(state.tabId)) tabs.set(state.tabId, state);
    }
  } catch {
    // storage.session unavailable — fall back to in-memory only
  }
}

export function listTabs(): TabState[] {
  return [...tabs.values()];
}

export function getTab(tabId: number): TabState {
  let state = tabs.get(tabId);
  if (!state) {
    state = {
      tabId,
      host: null,
      detected: { mode: 'unknown' },
      options: { ...DEFAULT_OPTIONS },
    };
    tabs.set(tabId, state);
  }
  return state;
}

export function updateTab(tabId: number, patch: Partial<TabState>): TabState {
  const state = getTab(tabId);
  Object.assign(state, patch);
  persist(state);
  return state;
}

function persist(state: TabState): void {
  try {
    void chrome.storage.session.set({ [keyFor(state.tabId)]: state });
  } catch {
    // ignore — best-effort persistence
  }
}

export function dropTab(tabId: number): void {
  tabs.delete(tabId);
  try {
    void chrome.storage.session.remove(keyFor(tabId));
  } catch {
    // ignore
  }
}
