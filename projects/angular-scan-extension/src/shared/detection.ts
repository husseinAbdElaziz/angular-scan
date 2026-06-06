import type { DetectionState } from './settings';

export interface NgDebugApi {
  getComponent: (el: Element) => object | null;
  getHostElement: (component: object) => Element | null;
  getRootComponents?: (el?: Element) => object[];
  ɵsetProfiler: (
    callback: ((event: number, instance: object | null, context?: unknown) => void) | null,
  ) => () => void;
  getDirectiveMetadata?: (instance: object) => unknown;
  version?: { full: string } | string;
}

declare global {
  interface Window {
    ng?: Partial<NgDebugApi>;
  }
}

export function getNgDebugApi(): NgDebugApi | null {
  if (typeof window === 'undefined') return null;
  const ng = window.ng;
  if (!ng || typeof ng !== 'object') return null;
  if (typeof ng.ɵsetProfiler !== 'function') return null;
  if (typeof ng.getHostElement !== 'function') return null;
  if (typeof ng.getComponent !== 'function') return null;
  return ng as NgDebugApi;
}

export function probeAngular(): DetectionState {
  if (typeof window === 'undefined') return { mode: 'no' };
  const ng = window.ng;
  if (!ng) return { mode: 'no' };
  if (typeof ng.ɵsetProfiler !== 'function') {
    return { mode: 'prod' };
  }
  const v = typeof ng.version === 'string' ? ng.version : ng.version?.full;
  return v ? { mode: 'yes', angularVersion: v } : { mode: 'yes' };
}
