import type { ComponentReport, PageOutbound } from '@shared/messages';
import { NS } from '@shared/messages';
import { getNgDebugApi, type NgDebugApi } from '@shared/detection';
import type { ScanOptions, TickSummary } from '@shared/settings';
import { Overlay } from './overlay';
import { resolveSourceLocation } from './source-location';
import { refreshSourceMapIndex, resolveFromSourceMap } from './source-map-resolver';
import { Tracker, type ComponentEntry } from './tracker';

// Angular profiler event IDs — stable dev-mode contract (matches Angular DevTools).
// Source: angular/packages/core/primitives/devtools/src/profiler_types.ts
const PE = {
  TemplateUpdateStart: 2,
  ChangeDetectionStart: 12,
  ChangeDetectionEnd: 13,
  ChangeDetectionSyncStart: 14,
  ChangeDetectionSyncEnd: 15,
} as const;

const RPS_WINDOW_MS = 5000;
const PEAK_WINDOW_MS = 1000;
const HIGHLIGHT_DURATION_MS = 1500;
const PRUNE_EVERY_TICKS = 50;

export class Scanner {
  private readonly tracker = new Tracker();
  private readonly overlay = new Overlay();
  private observer: MutationObserver | null = null;
  private mutatedNodes = new Set<Node>();
  private tickInstances = new Set<object>();
  private inTick = false;
  private inSync = false;
  private removeProfiler: (() => void) | null = null;
  private ng: NgDebugApi | null = null;
  private tickId = 0;
  private options: ScanOptions;

  constructor(options: ScanOptions) {
    this.options = options;
    this.overlay.setDuration(options.flashDurationMs);
    this.overlay.setBadgeSource(() => this.tracker.list());
  }

  start(): boolean {
    if (this.removeProfiler) return true;
    const ng = getNgDebugApi();
    if (!ng) return false;
    this.ng = ng;
    this.overlay.setFlashEnabled(this.options.showOverlay);
    this.overlay.setBadgesEnabled(this.options.showBadges);
    this.observer = new MutationObserver((records) => {
      for (const r of records) {
        this.mutatedNodes.add(r.target);
        r.addedNodes.forEach((n) => this.mutatedNodes.add(n));
        r.removedNodes.forEach((n) => this.mutatedNodes.add(n));
      }
    });
    this.removeProfiler = ng.ɵsetProfiler(this.profilerCallback);
    // Start building the source-map index in the background so components that
    // lack Angular class debug info still resolve to a file (see report()).
    refreshSourceMapIndex(true);
    this.seedExisting(ng);
    return true;
  }

  // Components that mounted before scanning started won't run change detection
  // until the user interacts, so the overlay would have nothing to label. Walk
  // the current DOM once and register every component host with a zero count so
  // badges and the report are populated immediately on enable.
  private seedExisting(ng: NgDebugApi): void {
    for (const el of document.body.querySelectorAll('*')) {
      let instance: object | null = null;
      try {
        instance = ng.getComponent(el);
      } catch {
        continue;
      }
      if (!instance) continue;
      const name = componentName(instance);
      const sourceLocation = resolveSourceLocation(instance, ng);
      this.tracker.ensure(instance, el, name, sourceLocation);
    }
  }

  stop(): void {
    this.removeProfiler?.();
    this.removeProfiler = null;
    this.observer?.disconnect();
    this.observer = null;
    this.mutatedNodes.clear();
    this.tickInstances.clear();
    this.inTick = false;
    this.inSync = false;
    this.overlay.disable();
  }

  setOptions(patch: Partial<ScanOptions>): void {
    const wasEnabled = this.options.enabled;
    this.options = { ...this.options, ...patch };
    if (patch.flashDurationMs != null) this.overlay.setDuration(patch.flashDurationMs);
    if (patch.showOverlay != null) this.overlay.setFlashEnabled(patch.showOverlay && !!this.removeProfiler);
    if (patch.showBadges != null) this.overlay.setBadgesEnabled(patch.showBadges && !!this.removeProfiler);
    if (patch.enabled != null && patch.enabled !== wasEnabled) {
      if (patch.enabled) this.start();
      else this.stop();
    }
  }

  reset(): void {
    this.tracker.reset();
  }

  report(): ComponentReport[] {
    const now = performance.now();
    // Pick up newly loaded chunks (lazy routes / MFE remotes); throttled internally.
    refreshSourceMapIndex();
    return this.tracker.list().map((e) => ({
      id: e.id,
      name: e.name,
      renders: e.renders,
      wasted: e.wasted,
      rps5s: computeRecentRate(e.timestamps, now, RPS_WINDOW_MS),
      rpsPeak: computePeakRate(e.timestamps, PEAK_WINDOW_MS),
      // Angular class debug info (set at ensure time) wins when present; otherwise
      // fall back to the source-map index. Resolved fresh each tick — not cached
      // on the entry — so a better-ranked source file replaces an earlier guess
      // (e.g. a compiled `.mjs`) once its chunk is indexed.
      sourceLocation: e.sourceLocation ?? resolveFromSourceMap(e.name),
    }));
  }

  highlight(componentId: string): void {
    const entry = this.tracker.byIdLookup(componentId);
    if (!entry || !entry.host.isConnected) return;
    this.overlay.pulse(entry, HIGHLIGHT_DURATION_MS);
  }

  private profilerCallback = (event: number, instance: object | null): void => {
    const ng = this.ng;
    const observer = this.observer;
    if (!ng || !observer) return;
    switch (event) {
      case PE.ChangeDetectionStart: {
        if (this.inTick) return;
        this.inTick = true;
        this.mutatedNodes.clear();
        this.tickInstances.clear();
        observer.observe(document.body, {
          subtree: true,
          childList: true,
          attributes: true,
          characterData: true,
        });
        return;
      }
      case PE.ChangeDetectionSyncStart:
        this.inSync = true;
        return;
      case PE.ChangeDetectionSyncEnd:
        this.inSync = false;
        return;
      case PE.TemplateUpdateStart:
        if (this.inSync && instance) this.tickInstances.add(instance);
        return;
      case PE.ChangeDetectionEnd: {
        if (!this.inTick) return;
        this.inTick = false;
        this.inSync = false;
        const pending = observer.takeRecords();
        for (const r of pending) {
          this.mutatedNodes.add(r.target);
          r.addedNodes.forEach((n) => this.mutatedNodes.add(n));
          r.removedNodes.forEach((n) => this.mutatedNodes.add(n));
        }
        observer.disconnect();
        this.flush();
        return;
      }
      default:
        return;
    }
  };

  private flush(): void {
    const ng = this.ng;
    if (!ng) return;
    const start = performance.now();
    const mutatedHosts = buildMutatedHosts(this.mutatedNodes, document.body, ng);
    let rendered = 0;
    let unnecessary = 0;
    let checked = 0;
    for (const instance of this.tickInstances) {
      let host: Element | null = null;
      try {
        host = ng.getHostElement(instance);
      } catch {
        continue;
      }
      if (!host) continue;
      checked++;
      const name = componentName(instance);
      const sourceLocation = resolveSourceLocation(instance, ng);
      const entry = this.tracker.ensure(instance, host, name, sourceLocation);
      entry.renders++;
      this.tracker.recordRender(entry, start);
      const isRender = mutatedHosts.has(host);
      if (isRender) {
        rendered++;
        entry.lastFlashKind = 'render';
      } else {
        unnecessary++;
        entry.wasted++;
        entry.lastFlashKind = 'wasted';
      }
      this.overlay.flash(entry, isRender ? 'render' : 'wasted');
      if (this.options.log) {
        // eslint-disable-next-line no-console
        console.log('[angular-scan]', name, entry.renders, isRender ? 'render' : 'wasted');
      }
    }
    this.tickId++;
    if (this.tickId % PRUNE_EVERY_TICKS === 0) this.tracker.prune();
    const summary: TickSummary = {
      tickId: this.tickId,
      checked,
      rendered,
      unnecessary,
      durationMs: performance.now() - start,
    };
    emit({ ns: NS, dir: 'out', cmd: 'tick', payload: summary });
  }
}

function buildMutatedHosts(nodes: Set<Node>, body: Element, ng: NgDebugApi): Set<Element> {
  const hosts = new Set<Element>();
  for (const node of nodes) {
    let current: Node | null = node;
    while (current && current !== body) {
      if (current instanceof Element) {
        try {
          if (ng.getComponent(current)) {
            hosts.add(current);
            break;
          }
        } catch {
          // node destroyed
        }
      }
      current = current.parentNode;
    }
  }
  return hosts;
}

function componentName(instance: object): string {
  return instance.constructor?.name ?? 'Anonymous';
}

function computeRecentRate(timestamps: number[], now: number, windowMs: number): number {
  if (timestamps.length === 0) return 0;
  const cutoff = now - windowMs;
  let count = 0;
  for (let i = timestamps.length - 1; i >= 0; i--) {
    if (timestamps[i] >= cutoff) count++;
    else break;
  }
  return +(count / (windowMs / 1000)).toFixed(2);
}

function computePeakRate(timestamps: number[], windowMs: number): number {
  if (timestamps.length === 0) return 0;
  let peak = 0;
  let head = 0;
  for (let tail = 0; tail < timestamps.length; tail++) {
    while (timestamps[tail] - timestamps[head] > windowMs) head++;
    const span = tail - head + 1;
    if (span > peak) peak = span;
  }
  return +(peak / (windowMs / 1000)).toFixed(2);
}

function emit(msg: PageOutbound): void {
  window.postMessage(msg, window.location.origin);
}

// re-export for typecheck
export type { ComponentEntry };
