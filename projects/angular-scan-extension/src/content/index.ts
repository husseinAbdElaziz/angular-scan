import type { BgInbound, PageInbound, PageOutbound } from '@shared/messages';
import { NS, isPageOutbound } from '@shared/messages';

relayPageToBackground();
relayBackgroundToPage();
requestInitialState();

function relayPageToBackground(): void {
  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!isPageOutbound(data)) return;
    routeToBackground(data);
  });
}

function routeToBackground(msg: PageOutbound): void {
  switch (msg.cmd) {
    case 'detected':
      void send({ type: 'detected', state: msg.payload });
      return;
    case 'tick':
      void send({ type: 'tick', summary: msg.payload });
      return;
    case 'report':
      void send({ type: 'reportResult', id: msg.id, report: msg.payload });
      return;
    default:
      return;
  }
}

function relayBackgroundToPage(): void {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (!msg || typeof msg !== 'object' || (msg as { ns?: string }).ns !== NS) {
      sendResponse({ ok: false });
      return false;
    }
    window.postMessage(msg as PageInbound, window.location.origin);
    sendResponse({ ok: true });
    return false;
  });
}

async function requestInitialState(): Promise<void> {
  try {
    const response = await chrome.runtime.sendMessage<BgInbound>({ type: 'getTabState' });
    if (response?.options) {
      window.postMessage(
        {
          ns: NS,
          dir: 'in',
          cmd: 'init',
          payload: response.options,
          id: 'initial',
        } satisfies PageInbound,
        window.location.origin,
      );
    }
  } catch {
    // background may be cold-starting
  }
}

function send(message: BgInbound): Promise<unknown> {
  // After the extension is reloaded/updated, this content script is orphaned and
  // chrome.runtime.sendMessage throws "Extension context invalidated" synchronously
  // (before returning a promise), so .catch alone wouldn't trap it.
  try {
    return chrome.runtime.sendMessage(message).catch(() => undefined);
  } catch {
    return Promise.resolve(undefined);
  }
}
