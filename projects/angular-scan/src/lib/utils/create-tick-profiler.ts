import type { TickProfilerOptions } from '../models/TickProfilerOptions';
import { PROFILER_EVENTS as PE } from '../models/ProfilerEvents';
import { buildMutatedHosts } from './build-mutated-hosts';
import { collectTickUpdates } from './collect-tick-updates';

/**
 * Wires up the Angular profiler + MutationObserver to track per-tick render updates.
 * Returns a teardown function that removes the profiler and disconnects the observer.
 */
export function createTickProfiler({
  ng,
  body,
  shouldTrack = () => true,
  onUpdates,
}: TickProfilerOptions): () => void {
  let inTick = false;
  let inSyncPhase = false;
  const mutatedNodes = new Set<Node>();
  const tickInstances = new Set<object>();

  const observer = new MutationObserver((records) => {
    for (const r of records) {
      mutatedNodes.add(r.target);
      r.addedNodes.forEach((n) => mutatedNodes.add(n));
      r.removedNodes.forEach((n) => mutatedNodes.add(n));
    }
  });

  const removeProfiler = ng.ɵsetProfiler((event, instance) => {
    switch (event) {
      case PE.ChangeDetectionStart:
        if (inTick) break;
        inTick = true;
        mutatedNodes.clear();
        tickInstances.clear();
        observer.observe(body, {
          subtree: true, childList: true, attributes: true, characterData: true,
        });
        break;

      case PE.ChangeDetectionSyncStart:
        inSyncPhase = true;
        break;

      case PE.ChangeDetectionSyncEnd:
        inSyncPhase = false;
        break;

      case PE.TemplateUpdateStart:
        if (inSyncPhase && instance && shouldTrack(instance)) {
          tickInstances.add(instance);
        }
        break;

      case PE.ChangeDetectionEnd: {
        if (!inTick) break;
        inTick = false;
        inSyncPhase = false;

        const pending = observer.takeRecords();
        for (const r of pending) {
          mutatedNodes.add(r.target);
          r.addedNodes.forEach((n) => mutatedNodes.add(n));
          r.removedNodes.forEach((n) => mutatedNodes.add(n));
        }
        observer.disconnect();

        const mutatedHosts = buildMutatedHosts(mutatedNodes, body, ng);
        onUpdates(collectTickUpdates(tickInstances, mutatedHosts, ng));
        break;
      }
    }
  });

  return () => {
    removeProfiler();
    observer.disconnect();
  };
}
