import type { RenderKind } from './RenderKind';

export interface FlashRect {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: RenderKind;
  startTime: number;
  durationMs: number;
}
