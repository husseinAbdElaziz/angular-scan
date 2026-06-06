import type { TabState } from './tab-state';

// Ticks fire many times per second; cache the last-applied badge per tab so a
// flood of identical updates collapses to zero chrome.action calls.
const lastApplied = new Map<number, string>();

export function forgetBadge(tabId: number): void {
  lastApplied.delete(tabId);
}

export async function refreshBadge(state: TabState): Promise<void> {
  const tabId = state.tabId;
  const { detected, options, lastSummary } = state;

  let text: string;
  let color: string;
  let title: string;

  if (detected.mode === 'no' || detected.mode === 'unknown') {
    text = '';
    color = '#000000';
    title = 'Angular Scan';
  } else if (detected.mode === 'prod') {
    text = 'PROD';
    color = '#888888';
    title = 'Angular Scan — production build (scan unavailable)';
  } else if (!options.enabled) {
    text = 'OFF';
    color = '#555555';
    title = 'Angular Scan — Angular detected, click to enable';
  } else {
    const wasted = lastSummary?.unnecessary ?? 0;
    if (wasted > 0) {
      text = String(Math.min(999, wasted));
      color = '#d62828';
      title = `Angular Scan — ${wasted} unnecessary renders this tick`;
    } else {
      text = 'ON';
      color = '#1aaf5d';
      title = 'Angular Scan — scanning';
    }
  }

  const key = `${text}|${color}|${title}`;
  if (lastApplied.get(tabId) === key) return;
  const ok = await safeSet({ tabId, text, color, title });
  if (ok) lastApplied.set(tabId, key);
  else lastApplied.delete(tabId);
}

async function safeSet(opts: { tabId: number; text: string; color: string; title: string }): Promise<boolean> {
  try {
    await chrome.action.setBadgeText({ tabId: opts.tabId, text: opts.text });
    await chrome.action.setBadgeBackgroundColor({ tabId: opts.tabId, color: opts.color });
    await chrome.action.setTitle({ tabId: opts.tabId, title: opts.title });
    return true;
  } catch {
    // tab may have closed mid-update; ignore
    return false;
  }
}
