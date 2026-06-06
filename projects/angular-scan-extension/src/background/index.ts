import type {
  BgInbound,
  BgTabStateResponse,
  ComponentReport,
  PageInbound,
  ScanTabInfo,
  ScanTabsResponse,
} from '@shared/messages';
import { NS } from '@shared/messages';
import { getOriginOptions, hostOf, setOriginOptions } from '@shared/storage';
import { forgetBadge, refreshBadge } from './badge';
import { dropTab, getTab, hydrate, listTabs, updateTab } from './tab-state';

const pendingReports = new Map<string, (report: ComponentReport[]) => void>();

chrome.runtime.onInstalled.addListener(() => {
  chrome.action.setBadgeText({ text: '' }).catch(() => {});
});

chrome.tabs.onRemoved.addListener((tabId) => {
  dropTab(tabId);
  forgetBadge(tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, info, tab) => {
  if (info.status !== 'loading' || !tab.url) return;
  await hydrate();
  const host = hostOf(tab.url);
  const options = host ? await getOriginOptions(host) : { ...(await getOriginOptions('')) };
  updateTab(tabId, { host, options, detected: { mode: 'unknown' }, lastSummary: undefined });
  await refreshBadge(getTab(tabId));
});

chrome.runtime.onMessage.addListener((rawMsg, sender, sendResponse) => {
  const tabId = sender.tab?.id;
  if (tabId == null) {
    void handlePopupMessage(rawMsg as BgInbound | PopupQuery | ListScanTabs, sendResponse);
    return true;
  }
  void handleTabMessage(tabId, rawMsg as BgInbound, sendResponse);
  return true;
});

async function handleTabMessage(
  tabId: number,
  msg: BgInbound,
  sendResponse: (r: unknown) => void,
): Promise<void> {
  await hydrate();
  const state = getTab(tabId);
  switch (msg.type) {
    case 'getTabState': {
      const response: BgTabStateResponse = {
        detected: state.detected,
        options: state.options,
        lastSummary: state.lastSummary,
      };
      sendResponse(response);
      return;
    }
    case 'detected': {
      // With all_frames injection, every subframe probes independently. A frame
      // without Angular (ads, blank iframes) must not downgrade a tab already
      // known to have Angular — only a real 'yes' from any frame can win, and
      // navigation resets detection via the onUpdated 'loading' handler.
      const prevMode = state.detected.mode;
      if (prevMode === 'yes' && msg.state.mode !== 'yes') {
        sendResponse({ ok: true });
        return;
      }
      updateTab(tabId, { detected: msg.state });
      const next = getTab(tabId);
      await refreshBadge(next);
      if (msg.state.mode === 'yes' && prevMode !== 'yes') {
        await sendToPage(tabId, {
          ns: NS,
          dir: 'in',
          cmd: 'init',
          payload: next.options,
          id: cryptoId(),
        });
      }
      sendResponse({ ok: true });
      return;
    }
    case 'tick': {
      updateTab(tabId, { lastSummary: msg.summary });
      await refreshBadge(getTab(tabId));
      sendResponse({ ok: true });
      return;
    }
    case 'reportResult': {
      const resolve = pendingReports.get(msg.id);
      pendingReports.delete(msg.id);
      resolve?.(msg.report);
      sendResponse({ ok: true });
      return;
    }
    default:
      sendResponse({ ok: false, error: 'unknown' });
  }
}

interface PopupQuery {
  type: 'popupQuery';
  tabId: number;
  payload?: BgInbound;
}

interface ListScanTabs {
  type: 'listScanTabs';
}

async function handlePopupMessage(
  msg: BgInbound | PopupQuery | ListScanTabs,
  sendResponse: (r: unknown) => void,
): Promise<void> {
  if (!('type' in msg)) {
    sendResponse({ ok: false });
    return;
  }
  if (msg.type === 'listScanTabs') {
    await handleListScanTabs(sendResponse);
    return;
  }
  if (msg.type !== 'popupQuery') {
    sendResponse({ ok: false });
    return;
  }
  await hydrate();
  const { tabId, payload } = msg;
  const state = getTab(tabId);
  if (!payload) {
    const response: BgTabStateResponse = {
      detected: state.detected,
      options: state.options,
      lastSummary: state.lastSummary,
    };
    sendResponse(response);
    return;
  }

  switch (payload.type) {
    case 'setEnabled': {
      const options = state.host
        ? await setOriginOptions(state.host, { enabled: payload.enabled })
        : { ...state.options, enabled: payload.enabled };
      updateTab(tabId, { options });
      await sendToPage(tabId, {
        ns: NS,
        dir: 'in',
        cmd: payload.enabled ? 'init' : 'stop',
        payload: options,
        id: cryptoId(),
      } as PageInbound);
      await refreshBadge(getTab(tabId));
      sendResponse({ ok: true, options });
      return;
    }
    case 'setOptions': {
      const options = state.host
        ? await setOriginOptions(state.host, payload.patch)
        : { ...state.options, ...payload.patch };
      updateTab(tabId, { options });
      await sendToPage(tabId, {
        ns: NS,
        dir: 'in',
        cmd: 'setOptions',
        payload: options,
        id: cryptoId(),
      });
      await refreshBadge(getTab(tabId));
      sendResponse({ ok: true, options });
      return;
    }
    case 'reset': {
      await sendToPage(tabId, { ns: NS, dir: 'in', cmd: 'reset', id: cryptoId() });
      updateTab(tabId, { lastSummary: undefined });
      await refreshBadge(getTab(tabId));
      sendResponse({ ok: true });
      return;
    }
    case 'getReport': {
      const report = await requestReport(tabId);
      sendResponse({ ok: true, report });
      return;
    }
    case 'highlight': {
      await sendToPage(tabId, {
        ns: NS,
        dir: 'in',
        cmd: 'highlight',
        componentId: payload.componentId,
        id: cryptoId(),
      });
      sendResponse({ ok: true });
      return;
    }
    default:
      sendResponse({ ok: false, error: 'unsupported' });
  }
}

async function handleListScanTabs(sendResponse: (r: unknown) => void): Promise<void> {
  await hydrate();
  const tabs: ScanTabInfo[] = [];
  for (const state of listTabs()) {
    if (state.detected.mode !== 'yes') continue;
    let title = '';
    let url = '';
    try {
      const tab = await chrome.tabs.get(state.tabId);
      title = tab.title ?? '';
      url = tab.url ?? '';
    } catch {
      continue; // tab closed since it was tracked
    }
    tabs.push({
      tabId: state.tabId,
      title,
      url,
      host: state.host,
      detected: state.detected,
      lastSummary: state.lastSummary,
    });
  }
  const response: ScanTabsResponse = { ok: true, tabs };
  sendResponse(response);
}

async function requestReport(tabId: number): Promise<ComponentReport[]> {
  const id = cryptoId();
  const promise = new Promise<ComponentReport[]>((resolve) => {
    pendingReports.set(id, resolve);
    setTimeout(() => {
      if (pendingReports.delete(id)) resolve([]);
    }, 1500);
  });
  await sendToPage(tabId, { ns: NS, dir: 'in', cmd: 'getReport', id });
  return promise;
}

async function sendToPage(tabId: number, message: PageInbound): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, message);
  } catch {
    // content script may not be ready
  }
}

function cryptoId(): string {
  return Math.random().toString(36).slice(2, 10);
}
