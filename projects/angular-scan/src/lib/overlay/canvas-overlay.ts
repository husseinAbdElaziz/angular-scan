import type { RenderKind } from '../types';

interface FlashRect {
  x: number;
  y: number;
  width: number;
  height: number;
  kind: RenderKind;
  startTime: number;
  durationMs: number;
}

// rgb(...) strings for fill and stroke
const RENDER_COLOR = '255, 200, 0';       // yellow — normal re-render
const UNNECESSARY_COLOR = '255, 60, 60';  // red — unnecessary render

export class CanvasOverlay {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private rects: FlashRect[] = [];
  private rafId = 0;
  private attached = false;

  attach(doc: Document): void {
    if (this.attached) return;

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
      `z-index:2147483646`,
    ].join(';');

    doc.body.appendChild(canvas);
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.attached = true;

    this.resize();
    window.addEventListener('resize', this.onResize);

    this.scheduleFrame();
  }

  detach(): void {
    if (!this.attached) return;
    this.attached = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.onResize);
    this.canvas?.remove();
    this.canvas = null;
    this.ctx = null;
    this.rects = [];
  }

  /** Queue a flash animation over an element's bounding rect. */
  flash(element: Element, kind: RenderKind, durationMs: number): void {
    if (!this.attached) return;

    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    this.rects.push({
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
      kind,
      startTime: performance.now(),
      durationMs,
    });
  }

  private readonly onResize = (): void => this.resize();

  private resize(): void {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private scheduleFrame(): void {
    if (!this.attached) return;
    this.rafId = requestAnimationFrame(this.drawFrame);
  }

  private readonly drawFrame = (now: number): void => {
    if (!this.ctx || !this.canvas || !this.attached) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Decay alphas and remove expired rects
    this.rects = this.rects.filter(r => {
      const elapsed = now - r.startTime;
      return elapsed < r.durationMs;
    });

    for (const r of this.rects) {
      const elapsed = now - r.startTime;
      const alpha = Math.max(0, 1 - elapsed / r.durationMs);
      const color = r.kind === 'render' ? RENDER_COLOR : UNNECESSARY_COLOR;

      // Semi-transparent fill
      this.ctx!.fillStyle = `rgba(${color}, ${alpha * 0.1})`;
      this.ctx!.fillRect(r.x, r.y, r.width, r.height);

      // Solid border
      this.ctx!.strokeStyle = `rgba(${color}, ${alpha * 0.9})`;
      this.ctx!.lineWidth = 2;
      this.ctx!.strokeRect(r.x + 1, r.y + 1, r.width - 2, r.height - 2);
    }

    this.scheduleFrame();
  };
}
