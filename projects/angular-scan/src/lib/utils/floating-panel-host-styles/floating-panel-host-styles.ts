import type { PanelPosition } from '../floating-panel-drag/floating-panel-drag';

export const DEFAULT_FLOATING_PANEL_MARGIN_PX = 16;

export function buildFloatingPanelHostStyles(
  position: PanelPosition | null,
  marginPx = DEFAULT_FLOATING_PANEL_MARGIN_PX,
): Record<string, string> {
  if (position === null) {
    return {
      display: 'block',
      bottom: `${marginPx}px`,
      right: `${marginPx}px`,
      left: 'auto',
      top: 'auto',
    };
  }
  return {
    display: 'block',
    left: `${position.left}px`,
    top: `${position.top}px`,
    bottom: 'auto',
    right: 'auto',
  };
}
