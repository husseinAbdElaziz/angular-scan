import type { NgDebugApi } from '../../models/NgDebugApi';

export function makeNgDebugApi(overrides: Partial<NgDebugApi> = {}): NgDebugApi {
  return {
    getComponent: () => null,
    getHostElement: () => null,
    getRootComponents: () => [],
    getOwningComponent: () => null,
    getDirectives: () => [],
    ɵsetProfiler: () => () => {},
    ...overrides,
  };
}
