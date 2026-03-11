/** Shape of the window.ng Angular debug API (dev mode only). */
export interface NgDebugApi {
  getComponent: (el: Element) => object | null;
  getHostElement: (component: object) => Element | null;
  getRootComponents: (el?: Element) => object[];
  getOwningComponent: (el: Element) => object | null;
  getDirectives: (el: Element) => object[];
  ɵsetProfiler: (
    callback: ((event: number, instance: object | null, context?: unknown) => void) | null,
  ) => () => void;
}
