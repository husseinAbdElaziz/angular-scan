import type { CanvasOverlay } from '../models/CanvasOverlay';
import type { FlashRect } from '../models/FlashRect';
import type { OverlayState } from '../models/OverlayState';
import type { RenderKind } from '../models/RenderKind';

const RENDER_COLOR = '255, 200, 0'; // yellow — normal re-render
const UNNECESSARY_COLOR = '255, 60, 60'; // red — unnecessary render

function createCanvas(doc: Document): HTMLCanvasElement {
  const canvas = doc.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.setAttribute('role', 'presentation');
  canvas.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    'width:100%',
    'height:100%',
    'pointer-events:none',
    'z-index:2147483646',
  ].join(';');
  return canvas;
}

function resizeCanvas(canvas: HTMLCanvasElement, win: Window & typeof globalThis): void {
  canvas.width = win.innerWidth;
  canvas.height = win.innerHeight;
}

function toFlashRect(
  element: Element,
  kind: RenderKind,
  durationMs: number,
  win: Window & typeof globalThis,
): FlashRect | null {
  const { left, top, width, height } = element.getBoundingClientRect();
  if (width === 0 || height === 0) return null;

  return { x: left, y: top, width, height, kind, startTime: win.performance.now(), durationMs };
}

function drawRect(ctx: CanvasRenderingContext2D, r: FlashRect, now: number): void {
  const elapsed = now - r.startTime;
  const alpha = Math.max(0, 1 - elapsed / r.durationMs);
  const color = r.kind === 'render' ? RENDER_COLOR : UNNECESSARY_COLOR;

  ctx.fillStyle = `rgba(${color}, ${alpha * 0.1})`;
  ctx.fillRect(r.x, r.y, r.width, r.height);

  ctx.strokeStyle = `rgba(${color}, ${alpha * 0.9})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x + 1, r.y + 1, r.width - 2, r.height - 2);
}

function renderFrame(
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  rects: readonly FlashRect[],
  now: number,
): FlashRect[] {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const active = rects.filter((r) => now - r.startTime < r.durationMs);
  for (const r of active) drawRect(ctx, r, now);
  return active;
}

/**
 * Creates a canvas overlay, attaches it to the document, and starts the render loop.
 * Returns a minimal interface: flash to queue an animation, detach to clean up.
 */
export function createCanvasOverlay(doc: Document, win: Window & typeof globalThis): CanvasOverlay {
  let state: OverlayState = { rects: [], rafId: 0 };

  const canvas = createCanvas(doc);
  doc.body.appendChild(canvas);
  const ctx = canvas.getContext('2d')!;

  const onResize = (): void => resizeCanvas(canvas, win);
  const loop = (now: number): void => {
    state = {
      rects: renderFrame(ctx, canvas, state.rects, now),
      rafId: win.requestAnimationFrame(loop),
    };
  };

  resizeCanvas(canvas, win);
  win.addEventListener('resize', onResize);
  state = { ...state, rafId: win.requestAnimationFrame(loop) };

  return {
    flash(element, kind, durationMs) {
      const rect = toFlashRect(element, kind, durationMs, win);
      if (rect) state = { ...state, rects: [...state.rects, rect] };
    },

    detach() {
      win.cancelAnimationFrame(state.rafId);
      win.removeEventListener('resize', onResize);
      canvas.remove();
      state = { rects: [], rafId: 0 };
    },
  };
}
