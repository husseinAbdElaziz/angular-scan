import type { BrowserWindow } from '../models/BrowserWindow';
import type { RenderKind } from '../models/RenderKind';

const BADGE_CSS = [
  'position:absolute',
  'top:2px',
  'right:2px',
  'z-index:2147483645',
  'pointer-events:none',
  'font:bold 9px/13px monospace',
  'padding:1px 4px',
  'border-radius:3px',
  'min-width:16px',
  'text-align:center',
  'color:#fff',
  'white-space:nowrap',
].join(';');

export const BADGE_COLORS = {
  render: '#ff9800',
  unnecessary: '#f44336',
} as const satisfies Record<RenderKind, string>;

/**
 * Creates or reuses the render-count badge on a host element.
 * Returns the badge so callers can set extra attributes (e.g. `title`).
 */
export function createOrUpdateBadge(
  badges: Map<Element, HTMLElement>,
  hostEl: Element,
  count: number,
  kind: RenderKind,
  doc: Document = document,
  win?: (BrowserWindow) | null,
): HTMLElement {
  let badge = badges.get(hostEl);

  if (!badge) {
    badge = doc.createElement('div');
    badge.setAttribute('aria-hidden', 'true');
    badge.setAttribute('role', 'presentation');
    badge.style.cssText = BADGE_CSS;
    ensurePositioned(hostEl, win);
    hostEl.appendChild(badge);
    badges.set(hostEl, badge);
  }

  badge.style.background = BADGE_COLORS[kind];
  badge.textContent = String(count);
  return badge;
}

export function ensurePositioned(
  el: Element,
  win?: (BrowserWindow) | null,
): void {
  const htmlEl = el as HTMLElement;
  const position = win
    ? win.getComputedStyle(htmlEl).position
    : getComputedStyle(htmlEl).position;
  if (!position || position === 'static') {
    htmlEl.style.position = 'relative';
  }
}

export function clearBadges(badges: Map<Element, HTMLElement>): void {
  for (const badge of badges.values()) {
    badge.remove();
  }
  badges.clear();
}
