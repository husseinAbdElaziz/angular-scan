import {
  Injectable,
  inject,
  isDevMode,
  OnDestroy,
  PLATFORM_ID,
  Injector,
  runInInjectionContext,
  afterEveryRender,
  AfterRenderRef,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ComponentTracker } from './component-tracker';
import { OverlayService } from './overlay/overlay.service';
import { ANGULAR_SCAN_OPTIONS } from './tokens';
import { getNgDebugApi } from './ng-debug';
import { ScanConfigService } from './scan-config.service';
import type { NgDebugApi, RenderKind } from './types';

// Angular profiler event IDs (stable contract in dev mode, used by Angular DevTools)
const TemplateUpdateStart = 2;
const ChangeDetectionStart = 12;
const ChangeDetectionEnd = 13;
const ChangeDetectionSyncStart = 14;
const ChangeDetectionSyncEnd = 15;

interface PendingUpdate {
  instance: object;
  hostElement: Element;
  kind: RenderKind;
}

@Injectable({ providedIn: 'root' })
export class ScannerService implements OnDestroy {
  private readonly tracker = inject(ComponentTracker);
  private readonly overlay = inject(OverlayService);
  private readonly options = inject(ANGULAR_SCAN_OPTIONS);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly injector = inject(Injector);
  private readonly config = inject(ScanConfigService);

  private removeProfiler: (() => void) | null = null;
  private afterRenderRef: AfterRenderRef | null = null;
  private mutationObserver: MutationObserver | null = null;

  // Accumulated during a single CD tick (raw DOM nodes, no signal writes)
  private mutatedNodes = new Set<Node>();
  // Component instances visited during the sync (template update) phase
  private tickInstances = new Set<object>();

  // Updates waiting to be flushed in afterEveryRender
  private pendingFlush: PendingUpdate[] = [];

  // Tracks which phase of CD we're in
  private inSyncPhase = false;
  private inTick = false;

  // The toolbar component instance — excluded from tracking to avoid self-loops
  private toolbarInstance: object | null = null;

  initialize(): void {
    if (!isDevMode()) return;
    if (!isPlatformBrowser(this.platformId)) return;
    if (this.options.enabled === false) return;

    const ng = getNgDebugApi();
    if (!ng) {
      console.warn(
        '[angular-scan] Angular debug APIs (window.ng) not available. ' +
        'Ensure you are running in development mode.'
      );
      return;
    }

    // afterEveryRender is Angular's safe hook for post-render writes.
    // Signal writes here cause exactly one extra toolbar render pass then stabilize,
    // avoiding the infinite loop that queueMicrotask causes in zone.js + signals hybrid apps.
    this.afterRenderRef = runInInjectionContext(this.injector, () =>
      afterEveryRender({ write: () => this.flushPendingUpdates() })
    );

    this.mutationObserver = new MutationObserver(records => {
      for (const r of records) {
        this.mutatedNodes.add(r.target);
        r.addedNodes.forEach(n => this.mutatedNodes.add(n));
        r.removedNodes.forEach(n => this.mutatedNodes.add(n));
      }
    });

    this.removeProfiler = ng.ɵsetProfiler((event, instance) => {
      switch (event) {
        case ChangeDetectionStart:
          this.onTickStart();
          break;
        case ChangeDetectionSyncStart:
          this.inSyncPhase = true;
          break;
        case ChangeDetectionSyncEnd:
          this.inSyncPhase = false;
          break;
        case TemplateUpdateStart:
          // Only record during the real update phase, not the dev-mode checkNoChanges pass
          if (this.config.enabled() && this.inSyncPhase && instance && instance !== this.toolbarInstance) {
            this.tickInstances.add(instance);
          }
          break;
        case ChangeDetectionEnd:
          this.onTickEnd(ng);
          break;
      }
    });
  }

  /** Exclude a component instance from render tracking (used for the toolbar). */
  setToolbarInstance(instance: object): void {
    this.toolbarInstance = instance;
  }

  private onTickStart(): void {
    if (this.inTick) return;
    this.inTick = true;
    this.mutatedNodes.clear();
    this.tickInstances.clear();

    this.mutationObserver?.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
  }

  private onTickEnd(ng: NgDebugApi): void {
    if (!this.inTick) return;
    this.inTick = false;
    this.inSyncPhase = false;

    // Synchronously flush pending mutation records before disconnecting
    const pending = this.mutationObserver?.takeRecords() ?? [];
    for (const r of pending) {
      this.mutatedNodes.add(r.target);
      r.addedNodes.forEach(n => this.mutatedNodes.add(n));
      r.removedNodes.forEach(n => this.mutatedNodes.add(n));
    }
    this.mutationObserver?.disconnect();

    // Build a set of component host elements that had DOM mutations
    // Walk mutated nodes UP to find their owning component host element
    const mutatedHosts = this.buildMutatedHosts(ng);

    // Collect updates as pure data — NO signal writes here (would trigger CD)
    const pendingUpdates: PendingUpdate[] = [];

    for (const instance of this.tickInstances) {
      try {
        const hostElement = ng.getHostElement(instance);
        if (!hostElement) continue;

        const hadMutation = mutatedHosts.has(hostElement);
        const kind: RenderKind = hadMutation ? 'render' : 'unnecessary';

        pendingUpdates.push({ instance, hostElement, kind });
      } catch {
        // Component may have been destroyed during the tick
      }
    }

    // Queue for afterEveryRender to flush safely — no direct signal writes here.
    this.pendingFlush.push(...pendingUpdates);
  }

  /**
   * Called by afterEveryRender. Drains pendingFlush into signals safely.
   * If there are no pending updates, returns immediately so Angular stabilizes.
   * If there are updates, signals are written → toolbar re-renders (one extra pass) → stabilizes.
   */
  private flushPendingUpdates(): void {
    const updates = this.pendingFlush.splice(0);
    if (updates.length === 0) return;

    for (const update of updates) {
      const stats = this.tracker.recordRender(update.instance, update.hostElement, update.kind);
      this.overlay.onComponentChecked(stats);
    }
    this.tracker.snapshotTrackedComponents();
  }

  /**
   * Build a Set of host Elements by walking each mutated node up the DOM tree
   * until an Angular component boundary is found.
   * This is O(mutatedNodes × depth) but depth is typically < 20.
   */
  private buildMutatedHosts(ng: NgDebugApi): Set<Element> {
    const hosts = new Set<Element>();

    for (const node of this.mutatedNodes) {
      let current: Node | null = node;

      while (current && current !== document.body) {
        if (current instanceof Element) {
          try {
            const component = ng.getComponent(current);
            if (component) {
              hosts.add(current);
              break;
            }
          } catch {
            // ignore
          }
        }
        current = current.parentNode;
      }
    }

    return hosts;
  }

  ngOnDestroy(): void {
    this.removeProfiler?.();
    this.removeProfiler = null;
    this.afterRenderRef?.destroy();
    this.afterRenderRef = null;
    this.mutationObserver?.disconnect();
    this.mutationObserver = null;
    this.pendingFlush = [];
    this.overlay.destroy();
  }
}
