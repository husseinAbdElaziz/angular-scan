import type { PageInbound, PageOutbound } from '@shared/messages';
import { NS } from '@shared/messages';
import { DEFAULT_OPTIONS } from '@shared/settings';
import { probeAngular } from '@shared/detection';
import { Scanner } from './scanner';

declare global {
  interface Window {
    __angularScanBridge?: {
      version: string;
      stop: () => void;
    };
  }
}

if (window.__angularScanBridge) {
  // Already instrumented — skip to avoid double registration
} else {
  init();
}

function init(): void {
  let scanner: Scanner | null = null;
  let detected = probeAngular();
  let attempts = 0;
  const maxAttempts = 20;

  const settle = (): void => {
    detected = probeAngular();
    emit({ ns: NS, dir: 'out', cmd: 'detected', payload: detected });
    if (detected.mode === 'yes') {
      attachListener();
      return;
    }
    if (detected.mode !== 'no' || attempts >= maxAttempts) return;
    attempts++;
    setTimeout(settle, 500);
  };

  const attachListener = (): void => {
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!isPageInbound(data)) return;
      handle(data);
    });
  };

  const handle = (msg: PageInbound): void => {
    switch (msg.cmd) {
      case 'init': {
        if (!scanner) scanner = new Scanner({ ...DEFAULT_OPTIONS, ...msg.payload });
        else scanner.setOptions(msg.payload);
        if (msg.payload.enabled) scanner.start();
        ack(msg.id);
        return;
      }
      case 'setOptions': {
        scanner?.setOptions(msg.payload);
        ack(msg.id);
        return;
      }
      case 'stop': {
        scanner?.stop();
        ack(msg.id);
        return;
      }
      case 'reset': {
        scanner?.reset();
        ack(msg.id);
        return;
      }
      case 'getReport': {
        const payload = scanner?.report() ?? [];
        emit({ ns: NS, dir: 'out', cmd: 'report', payload, id: msg.id });
        return;
      }
      case 'highlight': {
        scanner?.highlight(msg.componentId);
        ack(msg.id);
        return;
      }
      default:
        return;
    }
  };

  window.__angularScanBridge = {
    version: '0.1.0',
    stop: () => {
      scanner?.stop();
      scanner = null;
    },
  };

  settle();
}

function isPageInbound(value: unknown): value is PageInbound {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { ns?: unknown; dir?: unknown }).ns === NS &&
    (value as { dir?: unknown }).dir === 'in'
  );
}

function emit(msg: PageOutbound): void {
  window.postMessage(msg, window.location.origin);
}

function ack(id: string): void {
  emit({ ns: NS, dir: 'out', cmd: 'ack', id });
}
