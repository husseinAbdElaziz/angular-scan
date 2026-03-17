import { Injectable, signal } from '@angular/core';
import type { ComponentStats } from '../../models/ComponentStats';
import type { RenderKind } from '../../models/RenderKind';

@Injectable({ providedIn: 'root' })
export class ComponentTracker {
  private readonly byInstance = new WeakMap<object, ComponentStats>();
  private readonly byElement = new Map<Element, object>();

  readonly totalRenders = signal(0);
  readonly totalUnnecessary = signal(0);
  readonly trackedComponents = signal<readonly ComponentStats[]>([]);

  recordRender(instance: object, hostElement: Element, kind: RenderKind): ComponentStats {
    const DEFAULT = {
      componentName: instance.constructor.name,
      hostElement,
      totalRenders: 0,
      unnecessaryRenders: 0,
      lastRenderKind: kind,
      lastRenderTimestamp: 0,
    };
    const prev = this.byInstance.get(instance) ?? DEFAULT;

    const isUnnecessary = kind === 'unnecessary';
    const next: ComponentStats = {
      ...prev,
      totalRenders: prev.totalRenders + 1,
      unnecessaryRenders: prev.unnecessaryRenders + (isUnnecessary ? 1 : 0),
      lastRenderKind: kind,
      lastRenderTimestamp: Date.now(),
    };

    this.byInstance.set(instance, next);
    this.byElement.set(hostElement, instance);

    this.totalRenders.update((n) => n + 1);
    if (isUnnecessary) {
      this.totalUnnecessary.update((n) => n + 1);
    }

    return next;
  }

  snapshotTrackedComponents(): void {
    const list: ComponentStats[] = [];
    for (const [, instance] of this.byElement) {
      const stats = this.byInstance.get(instance);
      if (stats) {
        list.push(stats);
      }
    }
    this.trackedComponents.set(list);
  }

  reset(): void {
    this.byElement.clear();
    this.totalRenders.set(0);
    this.totalUnnecessary.set(0);
    this.trackedComponents.set([]);
  }
}
