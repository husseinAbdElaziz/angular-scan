import { isDevMode } from '@angular/core';
import { getNgDebugApi } from './ng-debug';
import { CanvasOverlay } from './overlay/canvas-overlay';
import type { AngularScanOptions, RenderKind } from './types';

// Profiler event constants
const TemplateUpdateStart = 2;
const ChangeDetectionStart = 12;
const ChangeDetectionEnd = 13;
const ChangeDetectionSyncStart = 14;
const ChangeDetectionSyncEnd = 15;

/**
 * Imperative API for angular-scan.
 *
 * Use this when you cannot modify application providers (e.g. micro-frontends,
 * third-party apps). Call before `bootstrapApplication()`.
 *
 * ```ts
 * // main.ts
 * import { scan } from 'angular-scan';
 * scan();
 * bootstrapApplication(AppComponent, appConfig);
 * ```
 *
 * @returns A teardown function that stops scanning and removes the overlay.
 */
export function scan(options: AngularScanOptions = {}): () => void {
  if (!isDevMode()) return noop;
  if (typeof window === 'undefined') return noop;
  if (options.enabled === false) return noop;

  const ng = getNgDebugApi();
  if (!ng) {
    console.warn(
      '[angular-scan] Angular debug APIs (window.ng) not available. ' +
      'Ensure you are running in development mode.'
    );
    return noop;
  }

  const durationMs = options.flashDurationMs ?? 500;
  const showBadges = options.showBadges !== false;

  const overlay = new CanvasOverlay();
  overlay.attach(document);

  // State for the current tick
  let inTick = false;
  let inSyncPhase = false;
  const mutatedNodes = new Set<Node>();
  const tickInstances = new Set<object>();
  const renderCounts = new WeakMap<object, number>();
  const unnecessaryCounts = new WeakMap<object, number>();
  const badges = new Map<Element, HTMLElement>();

  const observer = new MutationObserver(records => {
    for (const r of records) {
      mutatedNodes.add(r.target);
      r.addedNodes.forEach(n => mutatedNodes.add(n));
      r.removedNodes.forEach(n => mutatedNodes.add(n));
    }
  });

  const removeProfiler = ng.ɵsetProfiler((event, instance) => {
    switch (event) {
      case ChangeDetectionStart:
        if (inTick) break;
        inTick = true;
        mutatedNodes.clear();
        tickInstances.clear();
        observer.observe(document.body, {
          subtree: true, childList: true, attributes: true, characterData: true,
        });
        break;

      case ChangeDetectionSyncStart:
        inSyncPhase = true;
        break;

      case ChangeDetectionSyncEnd:
        inSyncPhase = false;
        break;

      case TemplateUpdateStart:
        if (inSyncPhase && instance) tickInstances.add(instance);
        break;

      case ChangeDetectionEnd: {
        if (!inTick) break;
        inTick = false;
        inSyncPhase = false;

        const pending = observer.takeRecords();
        for (const r of pending) {
          mutatedNodes.add(r.target);
          r.addedNodes.forEach(n => mutatedNodes.add(n));
          r.removedNodes.forEach(n => mutatedNodes.add(n));
        }
        observer.disconnect();

        // Build mutated host set
        const mutatedHosts = new Set<Element>();
        for (const node of mutatedNodes) {
          let current: Node | null = node;
          while (current && current !== document.body) {
            if (current instanceof Element) {
              try {
                if (ng.getComponent(current)) { mutatedHosts.add(current); break; }
              } catch { /* ignore */ }
            }
            current = current.parentNode;
          }
        }

        // Collect updates without writing to any signals
        const updates: Array<{ instance: object; hostEl: Element; kind: RenderKind }> = [];
        for (const inst of tickInstances) {
          try {
            const hostEl = ng.getHostElement(inst);
            if (!hostEl) continue;
            const kind: RenderKind = mutatedHosts.has(hostEl) ? 'render' : 'unnecessary';
            updates.push({ instance: inst, hostEl, kind });
          } catch { /* component destroyed */ }
        }

        queueMicrotask(() => {
          for (const { instance, hostEl, kind } of updates) {
            const count = (renderCounts.get(instance) ?? 0) + 1;
            renderCounts.set(instance, count);

            if (kind === 'unnecessary') {
              unnecessaryCounts.set(instance, (unnecessaryCounts.get(instance) ?? 0) + 1);
            }

            overlay.flash(hostEl, kind, durationMs);

            if (showBadges) updateBadge(hostEl, count, kind);
          }
        });
        break;
      }
    }
  });

  function updateBadge(hostEl: Element, count: number, kind: RenderKind): void {
    let badge = badges.get(hostEl);
    if (!badge) {
      badge = document.createElement('div');
      badge.setAttribute('aria-hidden', 'true');
      badge.setAttribute('role', 'presentation');
      badge.style.cssText = [
        'position:absolute', 'top:2px', 'right:2px',
        'z-index:2147483645', 'pointer-events:none',
        'font:bold 9px/13px monospace', 'padding:1px 4px',
        'border-radius:3px', 'min-width:16px', 'text-align:center', 'color:#fff',
      ].join(';');
      const htmlEl = hostEl as HTMLElement;
      if (getComputedStyle(htmlEl).position === 'static') htmlEl.style.position = 'relative';
      hostEl.appendChild(badge);
      badges.set(hostEl, badge);
    }
    badge.style.background = kind === 'unnecessary' ? '#f44336' : '#ff9800';
    badge.textContent = String(count);
  }

  return () => {
    removeProfiler();
    observer.disconnect();
    overlay.detach();
    for (const b of badges.values()) b.remove();
    badges.clear();
  };
}

function noop(): void {}
