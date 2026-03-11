import type { RenderKind } from './RenderKind';

export interface CanvasOverlay {
  flash(element: Element, kind: RenderKind, durationMs: number): void;
  detach(): void;
}
