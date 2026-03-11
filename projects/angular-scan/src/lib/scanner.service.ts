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
import type { PendingUpdate } from './models/PendingUpdate';
import { getNgDebugApi } from './ng-debug';
import { OverlayService } from './overlay/overlay.service';
import { ScanConfigService } from './scan-config.service';
import { ANGULAR_SCAN_OPTIONS, WINDOW } from './tokens';
import { createTickProfiler } from './utils/create-tick-profiler';

@Injectable({ providedIn: 'root' })
export class ScannerService implements OnDestroy {
  private readonly tracker = inject(ComponentTracker);
  private readonly overlay = inject(OverlayService);
  private readonly options = inject(ANGULAR_SCAN_OPTIONS);
  private readonly win = inject(WINDOW);
  private readonly document = inject(DOCUMENT);
  private readonly injector = inject(Injector);
  private readonly config = inject(ScanConfigService);

  private teardownProfiler: (() => void) | null = null;
  private afterRenderRef: AfterRenderRef | null = null;
  private pendingFlush: PendingUpdate[] = [];
  private toolbarInstance: object | null = null;

  initialize(): void {
    if (!isDevMode() || !this.win || this.options.enabled === false) return;

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

    this.teardownProfiler = createTickProfiler({
      ng,
      body: this.document.body,
      shouldTrack: (instance) =>
        this.config.enabled() && instance !== this.toolbarInstance,
      onUpdates: (updates) => this.pendingFlush.push(...updates),
    });
  }

  setToolbarInstance(instance: object): void {
    this.toolbarInstance = instance;
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
    this.teardownProfiler?.();
    this.teardownProfiler = null;
    this.afterRenderRef?.destroy();
    this.afterRenderRef = null;
    this.pendingFlush = [];
    this.overlay.destroy();
  }
}
