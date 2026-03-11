import type { NgDebugApi } from './models/NgDebugApi';

/**
 * Returns the Angular debug API (window.ng) if available.
 * Returns null in SSR, production builds, or when Angular DevTools APIs are absent.
 *
 * Safe to call before Angular is bootstrapped — the API is attached to window
 * by Angular's dev mode runtime.
 */
export function getNgDebugApi(): NgDebugApi | null {
  if (typeof window === 'undefined') return null;

  const ng = (window as unknown as Record<string, unknown>)['ng'];
  if (!ng || typeof ng !== 'object') return null;

  const api = ng as Partial<NgDebugApi>;

  // ɵsetProfiler is the sentinel for dev mode — absent in production builds
  if (typeof api.ɵsetProfiler !== 'function') return null;
  if (typeof api.getHostElement !== 'function') return null;

  return api as NgDebugApi;
}
