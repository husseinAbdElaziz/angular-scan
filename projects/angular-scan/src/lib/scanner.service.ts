import {
  afterEveryRender,
  AfterRenderRef,
  DOCUMENT,
  inject,
  Injectable,
  Injector,
  isDevMode,
  OnDestroy,
  runInInjectionContext,
} from '@angular/core';
import { ComponentTracker } from './component-tracker';
import type { NgDebugApi } from './models/NgDebugApi';
import type { PendingUpdate } from './models/PendingUpdate';
import { PROFILER_EVENTS as PE } from './models/ProfilerEvents';
import { getNgDebugApi } from './ng-debug';
import { OverlayService } from './overlay/overlay.service';
import { ScanConfigService } from './scan-config.service';
import { ANGULAR_SCAN_OPTIONS, WINDOW } from './tokens';
import { buildMutatedHosts } from './utils/build-mutated-hosts';
import { collectTickUpdates } from './utils/collect-tick-updates';

@Injectable({ providedIn: 'root' })
export class ScannerService implements OnDestroy {
  private readonly tracker = inject(ComponentTracker);
  private readonly overlay = inject(OverlayService);
  private readonly options = inject(ANGULAR_SCAN_OPTIONS);
  private readonly win = inject(WINDOW);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly config = inject(ScanConfigService);

  private removeProfiler: (() => void) | null = null;
  private afterRenderRef: AfterRenderRef | null = null;
  private mutationObserver: MutationObserver | null = null;

  private readonly mutatedNodes = new Set<Node>();
  private readonly tickInstances = new Set<object>();
  private pendingFlush: PendingUpdate[] = [];

  private inSyncPhase = false;
  private inTick = false;
  private toolbarInstance: object | null = null;

  initialize(): void {
    if (!isDevMode()) return;
    if (!this.win) return;
    if (this.options.enabled === false) return;

    const ng = getNgDebugApi();
    if (!ng) {
      console.warn(
        '[angular-scan] Angular debug APIs (window.ng) not available. ' +
          'Ensure you are running in development mode.',
      );
      return;
    }

    this.afterRenderRef = runInInjectionContext(this.injector, () =>
      afterEveryRender({ write: () => this.flushPendingUpdates() }),
    );

    this.mutationObserver = new MutationObserver((records) => {
      for (const r of records) {
        this.mutatedNodes.add(r.target);
        r.addedNodes.forEach((n) => this.mutatedNodes.add(n));
        r.removedNodes.forEach((n) => this.mutatedNodes.add(n));
      }
    });

    this.removeProfiler = ng.ɵsetProfiler((event, instance) => {
      switch (event) {
        case PE.ChangeDetectionStart:
          this.onTickStart();
          break;
        case PE.ChangeDetectionSyncStart:
          this.inSyncPhase = true;
          break;
        case PE.ChangeDetectionSyncEnd:
          this.inSyncPhase = false;
          break;
        case PE.TemplateUpdateStart:
          if (this.config.enabled() && this.inSyncPhase && instance && instance !== this.toolbarInstance) {
            this.tickInstances.add(instance);
          }
          break;
        case PE.ChangeDetectionEnd:
          this.onTickEnd(ng);
          break;
      }
    });
  }

  setToolbarInstance(instance: object): void {
    this.toolbarInstance = instance;
  }

  private onTickStart(): void {
    if (this.inTick) return;
    this.inTick = true;
    this.mutatedNodes.clear();
    this.tickInstances.clear();

    this.mutationObserver?.observe(this.document.body, {
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

    const pending = this.mutationObserver?.takeRecords() ?? [];
    for (const r of pending) {
      this.mutatedNodes.add(r.target);
      r.addedNodes.forEach((n) => this.mutatedNodes.add(n));
      r.removedNodes.forEach((n) => this.mutatedNodes.add(n));
    }
    this.mutationObserver?.disconnect();

    const mutatedHosts = buildMutatedHosts(this.mutatedNodes, this.document.body, ng);
    const updates = collectTickUpdates(this.tickInstances, mutatedHosts, ng);

    this.pendingFlush.push(...updates);
  }

  private flushPendingUpdates(): void {
    const updates = this.pendingFlush.splice(0);
    if (updates.length === 0) return;

    for (const { instance, hostElement, kind } of updates) {
      const stats = this.tracker.recordRender(instance, hostElement, kind);
      this.overlay.onComponentChecked(stats);
    }
    this.tracker.snapshotTrackedComponents();
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
