import type { NgDebugApi } from '../../models/NgDebugApi';
import type { PendingUpdate } from '../../models/PendingUpdate';
import type { RenderKind } from '../../models/RenderKind';

/** Map checked instances to PendingUpdate records — pure, no side effects. */
export function collectTickUpdates(
  instances: Set<object>,
  mutatedHosts: Set<Element>,
  ng: NgDebugApi,
): PendingUpdate[] {
  const updates: PendingUpdate[] = [];

  for (const instance of instances) {
    try {
      const hostElement = ng.getHostElement(instance);
      if (!hostElement) continue;
      const kind: RenderKind = mutatedHosts.has(hostElement) ? 'render' : 'unnecessary';
      updates.push({ instance, hostElement, kind });
    } catch { /* component destroyed */ }
  }

  return updates;
}
