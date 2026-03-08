import { Injectable, signal } from '@angular/core';
import type { ComponentStats, RenderKind } from './types';

@Injectable({ providedIn: 'root' })
export class ComponentTracker {
  // WeakMap: component instance → stats. GC-safe: entries are freed when
  // the component instance is garbage collected after destruction.
  private readonly byInstance = new WeakMap<object, ComponentStats>();

  // Strong map: host element → component instance. Used for mutation-to-component
  // lookup. Entries must be manually removed when components are destroyed.
  private readonly byElement = new Map<Element, object>();

  private readonly _totalRenders = signal(0);
  private readonly _totalUnnecessary = signal(0);
  private readonly _trackedComponents = signal<readonly ComponentStats[]>([]);

  readonly totalRenders = this._totalRenders.asReadonly();
  readonly totalUnnecessary = this._totalUnnecessary.asReadonly();
  readonly trackedComponents = this._trackedComponents.asReadonly();

  /**
   * Record a render event for a component.
   * NOTE: Must be called outside of a profiler callback to avoid triggering CD.
   * Use queueMicrotask() to defer calls from profiler events.
   */
  recordRender(instance: object, hostElement: Element, kind: RenderKind): ComponentStats {
    let stats = this.byInstance.get(instance);

    if (!stats) {
      stats = {
        componentName: instance.constructor.name,
        hostElement,
        totalRenders: 0,
        unnecessaryRenders: 0,
        lastRenderKind: kind,
        lastRenderTimestamp: 0,
      };
      this.byInstance.set(instance, stats);
      this.byElement.set(hostElement, instance);
    }

    stats.totalRenders++;
    stats.lastRenderKind = kind;
    stats.lastRenderTimestamp = Date.now();

    if (kind === 'unnecessary') {
      stats.unnecessaryRenders++;
      this._totalUnnecessary.update(n => n + 1);
    }

    this._totalRenders.update(n => n + 1);
    return stats;
  }

  /**
   * Rebuild the trackedComponents signal from the current element map.
   * Call once per tick after all recordRender() calls.
   */
  snapshotTrackedComponents(): void {
    const list: ComponentStats[] = [];
    for (const [, instance] of this.byElement) {
      const stats = this.byInstance.get(instance);
      if (stats) list.push(stats);
    }
    this._trackedComponents.set(list);
  }

  /** Remove a component from tracking (call when its host element is removed). */
  unregister(el: Element): void {
    this.byElement.delete(el);
  }

  reset(): void {
    this.byElement.clear();
    this._totalRenders.set(0);
    this._totalUnnecessary.set(0);
    this._trackedComponents.set([]);
  }
}
