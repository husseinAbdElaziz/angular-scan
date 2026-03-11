import type { FlashRect } from './FlashRect';

export interface OverlayState {
  readonly rects: readonly FlashRect[];
  readonly rafId: number;
}
