import { isDevMode } from '@angular/core';
import type { AngularScanOptions } from './models/AngularScanOptions';
import { clearBadges, createOrUpdateBadge } from './overlay/badge';
import { createCanvasOverlay } from './overlay/canvas-overlay';
import { createTickProfiler } from './utils/create-tick-profiler/create-tick-profiler';
import { getNgDebugApi } from './utils/ng-debug/ng-debug';

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
  if (!isDevMode()) {
    return () => {};
  }
  if (typeof window === 'undefined') {
    return () => {};
  }
  if (options.enabled === false) {
    return () => {};
  }

  const ng = getNgDebugApi();
  if (!ng) {
    console.warn(
      '[angular-scan] Angular debug APIs (window.ng) not available. ' +
        'Ensure you are running in development mode.',
    );
    return () => {};
  }

  const durationMs = options.flashDurationMs ?? 500;
  const showBadges = options.showBadges !== false;
  const overlay = createCanvasOverlay(document, window);
  const renderCounts = new WeakMap<object, number>();
  const badges = new Map<Element, HTMLElement>();

  const teardown = createTickProfiler({
    ng,
    body: document.body,
    onUpdates: (updates) => {
      queueMicrotask(() => {
        for (const { instance, hostElement, kind } of updates) {
          const count = (renderCounts.get(instance) ?? 0) + 1;
          renderCounts.set(instance, count);
          overlay.flash(hostElement, kind, durationMs);
          if (showBadges) {
            createOrUpdateBadge(badges, hostElement, count, kind);
          }
        }
      });
    },
  });

  return () => {
    teardown();
    overlay.detach();
    clearBadges(badges);
  };
}
