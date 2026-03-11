import type { NgDebugApi } from './NgDebugApi';
import type { PendingUpdate } from './PendingUpdate';

export interface TickProfilerOptions {
  ng: NgDebugApi;
  body: Element;
  /** Return false to skip tracking an instance (e.g. toolbar exclusion, paused state). */
  shouldTrack?: (instance: object) => boolean;
  /** Called at the end of each tick with the collected updates. */
  onUpdates: (updates: PendingUpdate[]) => void;
}
