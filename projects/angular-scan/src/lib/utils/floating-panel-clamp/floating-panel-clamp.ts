import type { PanelPosition } from '../floating-panel-drag/floating-panel-drag';

export type FloatingPanelRect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

export function clampFloatingPanelToViewport(
  rect: FloatingPanelRect,
  position: PanelPosition,
  viewportPaddingPx: number,
): PanelPosition {
  const maxLeft = Math.max(
    viewportPaddingPx,
    window.innerWidth - rect.width - viewportPaddingPx,
  );
  const maxTop = Math.max(
    viewportPaddingPx,
    window.innerHeight - rect.height - viewportPaddingPx,
  );
  return {
    left: clamp(position.left, viewportPaddingPx, maxLeft),
    top: clamp(position.top, viewportPaddingPx, maxTop),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
