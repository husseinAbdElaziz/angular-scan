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
import { ComponentTracker } from '../component-tracker/component-tracker';
import type { PendingUpdate } from '../../models/PendingUpdate';
import { getNgDebugApi } from '../../utils/ng-debug/ng-debug';
import { OverlayService } from '../../overlay/overlay.service';
import { ScanConfigService } from '../scan-config/scan-config.service';
import { ANGULAR_SCAN_OPTIONS, WINDOW } from '../../tokens';
import { createTickProfiler } from '../../utils/create-tick-profiler/create-tick-profiler';

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
  private toolbarHost: HTMLElement | null = null;

  initialize(): void {
    if (!isDevMode() || !this.win) {
      return;
    }

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

  setToolbar(instance: object, hostElement: HTMLElement): void {
    this.toolbarInstance = instance;
    this.toolbarHost = hostElement;
  }

  private flushPendingUpdates(): void {
    const updates = this.pendingFlush.splice(0);
    if (updates.length === 0) return;

    this.overlay.pruneStaleBadges();

    for (const { instance, hostElement, kind } of updates) {
      if (this.isToolbarHost(hostElement)) {
        continue;
      }
      const stats = this.tracker.recordRender(instance, hostElement, kind);
      this.overlay.onComponentChecked(stats);
    }
    this.tracker.snapshotTrackedComponents();
  }

  private isToolbarHost(hostElement: Element): boolean {
    return this.toolbarHost?.contains(hostElement) ?? false;
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
