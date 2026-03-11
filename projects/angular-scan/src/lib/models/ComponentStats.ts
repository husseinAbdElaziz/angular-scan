import type { RenderKind } from './RenderKind';

/** Accumulated stats for a single component across its lifetime. */
export interface ComponentStats {
  componentName: string;
  hostElement: Element;
  totalRenders: number;
  unnecessaryRenders: number;
  lastRenderKind: RenderKind;
  lastRenderTimestamp: number;
}
