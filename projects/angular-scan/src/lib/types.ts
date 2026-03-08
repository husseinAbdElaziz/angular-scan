/** Whether a render was meaningful (DOM changed) or wasted (DOM unchanged). */
export type RenderKind = 'render' | 'unnecessary';

/** Accumulated stats for a single component across its lifetime. */
export interface ComponentStats {
  componentName: string;
  hostElement: Element;
  totalRenders: number;
  unnecessaryRenders: number;
  lastRenderKind: RenderKind;
  lastRenderTimestamp: number;
}

/** Options for configuring angular-scan. */
export interface AngularScanOptions {
  /** Set to false to disable scanning entirely. Default: true. */
  enabled?: boolean;
  /** Duration of the canvas flash in milliseconds. Default: 500. */
  flashDurationMs?: number;
  /** Show render count badges on component host elements. Default: true. */
  showBadges?: boolean;
  /** Show the floating toolbar HUD. Default: true. */
  showToolbar?: boolean;
}

/** Shape of the window.ng Angular debug API (dev mode only). */
export interface NgDebugApi {
  getComponent: (el: Element) => object | null;
  getHostElement: (component: object) => Element | null;
  getRootComponents: (el?: Element) => object[];
  getOwningComponent: (el: Element) => object | null;
  getDirectives: (el: Element) => object[];
  ɵsetProfiler: (
    callback: ((event: number, instance: object | null, context?: unknown) => void) | null
  ) => () => void;
}
