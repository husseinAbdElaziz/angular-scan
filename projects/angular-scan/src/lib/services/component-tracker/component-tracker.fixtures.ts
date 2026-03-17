import type { ComponentStats } from '../../models/ComponentStats';
import type { RenderKind } from '../../models/RenderKind';

export function makeComponentStats(overrides: Partial<ComponentStats> = {}): ComponentStats {
  return {
    componentName: 'TestComponent',
    hostElement: document.createElement('div'),
    totalRenders: 1,
    unnecessaryRenders: 0,
    lastRenderKind: 'render',
    lastRenderTimestamp: 0,
    ...overrides,
  };
}

export const RENDER_KINDS: RenderKind[] = ['render', 'unnecessary'];
