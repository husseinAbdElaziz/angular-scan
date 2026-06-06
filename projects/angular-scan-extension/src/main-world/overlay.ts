import type { ComponentEntry } from './tracker';

interface ActiveFlash {
  entry: ComponentEntry;
  kind: 'render' | 'wasted';
  startedAt: number;
}

const BADGE_HEIGHT = 14;

export class Overlay {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private rafId = 0;
  private readonly flashes = new Set<ActiveFlash>();
  private flashDurationMs = 500;
  private dpr = 1;

  private flashEnabled = false;
  private badgesEnabled = false;
  private badgeSource: (() => ComponentEntry[]) | null = null;
  private lastPromoteAt = 0;

  setBadgeSource(source: () => ComponentEntry[]): void {
    this.badgeSource = source;
  }

  setFlashEnabled(value: boolean): void {
    this.flashEnabled = value;
    if (!value) this.flashes.clear();
    this.reconcile();
  }

  setBadgesEnabled(value: boolean): void {
    this.badgesEnabled = value;
    this.reconcile();
  }

  disable(): void {
    this.flashEnabled = false;
    this.badgesEnabled = false;
    this.flashes.clear();
    this.teardown();
  }

  setDuration(ms: number): void {
    this.flashDurationMs = Math.max(50, ms);
  }

  flash(entry: ComponentEntry, kind: 'render' | 'wasted'): void {
    if (!this.flashEnabled || !this.canvas) return;
    this.flashes.add({ entry, kind, startedAt: performance.now() });
  }

  // Force a one-off highlight pulse even when flashes are disabled.
  pulse(entry: ComponentEntry, durationMs: number): void {
    const wasEnabled = this.flashEnabled;
    this.flashEnabled = true;
    this.reconcile();
    const saved = this.flashDurationMs;
    this.flashDurationMs = durationMs;
    this.flashes.add({ entry, kind: 'render', startedAt: performance.now() });
    this.flashDurationMs = saved;
    if (!wasEnabled) {
      setTimeout(() => {
        this.flashEnabled = false;
        this.flashes.clear();
        this.reconcile();
      }, durationMs + 50);
    }
  }

  private reconcile(): void {
    if (this.flashEnabled || this.badgesEnabled) this.ensure();
    else this.teardown();
  }

  private ensure(): void {
    if (this.canvas) return;
    this.canvas = document.createElement('canvas');
    this.canvas.dataset.angularScan = 'overlay';
    // Max z-index handles normal high-z modals. The extra resets (margin/border/
    // background/max-*) neutralize the UA popover styling applied below.
    this.canvas.style.cssText =
      'position:fixed;inset:0;width:100vw;height:100vh;margin:0;border:0;padding:0;' +
      'background:transparent;max-width:none;max-height:none;pointer-events:none;z-index:2147483647;';
    document.documentElement.appendChild(this.canvas);
    this.ctx = this.canvas.getContext('2d');
    this.resize();
    this.promoteToTopLayer();
    window.addEventListener('resize', this.resize);
    this.loop();
  }

  // Native <dialog>.showModal() and Popover API modals render in the browser
  // "top layer", which is above every z-index. To draw over them the canvas must
  // join the top layer too — done here via the Popover API (feature-detected).
  private promoteToTopLayer(): void {
    const el = this.canvas as (HTMLCanvasElement & { showPopover?: () => void }) | null;
    if (!el || typeof el.showPopover !== 'function') return;
    try {
      el.setAttribute('popover', 'manual');
      el.showPopover();
    } catch {
      // Popover unsupported or blocked — z-index fallback still applies.
    }
  }

  // Top-layer order is last-shown-on-top, so a modal opened after us would stack
  // above. Periodically re-show to climb back above newly opened dialogs.
  private reassertTopLayer(now: number): void {
    if (now - this.lastPromoteAt < 500) return;
    this.lastPromoteAt = now;
    const el = this.canvas as
      | (HTMLCanvasElement & { showPopover?: () => void; hidePopover?: () => void })
      | null;
    if (!el || typeof el.showPopover !== 'function' || !el.hasAttribute('popover')) return;
    try {
      if (el.matches(':popover-open')) el.hidePopover?.();
      el.showPopover();
    } catch {
      // ignore — transient top-layer state
    }
  }

  private teardown(): void {
    if (!this.canvas) return;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.resize);
    this.canvas.remove();
    this.canvas = null;
    this.ctx = null;
  }

  private resize = (): void => {
    if (!this.canvas) return;
    this.dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx?.scale(this.dpr, this.dpr);
  };

  private loop = (): void => {
    if (!this.canvas || !this.ctx) return;
    this.rafId = requestAnimationFrame(this.loop);
    const ctx = this.ctx;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    const now = performance.now();
    this.reassertTopLayer(now);
    this.drawFlashes(ctx, now);
    this.drawBadges(ctx);
  };

  private drawFlashes(ctx: CanvasRenderingContext2D, now: number): void {
    for (const f of this.flashes) {
      const t = (now - f.startedAt) / this.flashDurationMs;
      if (t >= 1 || !f.entry.host.isConnected) {
        this.flashes.delete(f);
        continue;
      }
      const rect = f.entry.host.getBoundingClientRect();
      const alpha = 1 - t;
      // Colors match the angular-scan library: yellow = meaningful render, red = unnecessary.
      const rgb = f.kind === 'wasted' ? '255, 60, 60' : '255, 200, 0';
      const fill = `rgba(${rgb}, ${alpha * 0.25})`;
      const border = `rgba(${rgb}, ${alpha})`;
      ctx.fillStyle = fill;
      ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.left, rect.top, rect.width, rect.height);
    }
  }

  // Recomputed live every frame so badges stay pinned to their host while the
  // page scrolls. These are layout reads with no interleaved DOM writes, so the
  // browser does a single layout flush per frame — same cost as the flashes.
  private drawBadges(ctx: CanvasRenderingContext2D): void {
    const source = this.badgeSource;
    if (!this.badgesEnabled || !source) return;
    ctx.font = '10px monospace';
    ctx.textBaseline = 'middle';
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    for (const entry of source()) {
      const host = entry.host;
      if (!host.isConnected) continue;
      const rect = host.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.bottom < 0 || rect.top > vh || rect.right < 0 || rect.left > vw) continue;
      // Badge color reflects the component's most recent render kind, like the
      // library: orange = meaningful, red = unnecessary, gray = not yet rendered.
      const bg =
        entry.lastFlashKind === 'render' ? '#ff9800' : entry.lastFlashKind === 'wasted' ? '#f44336' : '#555';
      const text = entry.wasted > 0 ? `${entry.renders} (${entry.wasted}w)` : `${entry.renders}`;
      const w = Math.ceil(ctx.measureText(text).width) + 8;
      const x = Math.min(Math.max(0, rect.right - w), Math.max(0, vw - w));
      const y = Math.min(Math.max(0, rect.top), Math.max(0, vh - BADGE_HEIGHT));
      ctx.fillStyle = bg;
      ctx.fillRect(x, y, w, BADGE_HEIGHT);
      ctx.fillStyle = '#fff';
      ctx.fillText(text, x + 4, y + BADGE_HEIGHT / 2 + 0.5);
    }
  }
}
