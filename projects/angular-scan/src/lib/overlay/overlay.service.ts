import { Injectable, inject, isDevMode, DOCUMENT } from '@angular/core';
import type { CanvasOverlay } from '../models/CanvasOverlay';
import type { ComponentStats } from '../models/ComponentStats';
import { createCanvasOverlay } from './canvas-overlay';
import { ANGULAR_SCAN_OPTIONS, WINDOW } from '../tokens';
import { ScanConfigService } from '../scan-config.service';

@Injectable({ providedIn: 'root' })
export class OverlayService {
  private readonly document = inject(DOCUMENT);
  private readonly win = inject(WINDOW);
  private readonly options = inject(ANGULAR_SCAN_OPTIONS);
  private readonly config = inject(ScanConfigService);

  private canvas: CanvasOverlay | null = null;
  private readonly badges = new Map<Element, HTMLElement>();

  initialize(): void {
    if (!isDevMode()) return;
    if (!this.win) return;  // null in SSR
    if (this.options.enabled === false) return;

    this.canvas = createCanvasOverlay(this.document, this.win);
  }

  destroy(): void {
    this.canvas?.detach();
    this.canvas = null;
    for (const badge of this.badges.values()) badge.remove();
    this.badges.clear();
  }

  onComponentChecked(stats: ComponentStats): void {
    if (this.config.showOverlay()) {
      this.canvas?.flash(stats.hostElement, stats.lastRenderKind, this.config.flashDurationMs());
    }

    if (this.config.showBadges()) {
      this.updateBadge(stats);
    } else {
      this.removeBadge(stats.hostElement);
    }
  }

  removeBadge(el: Element): void {
    this.badges.get(el)?.remove();
    this.badges.delete(el);
  }

  private updateBadge(stats: ComponentStats): void {
    let badge = this.badges.get(stats.hostElement);

    if (!badge) {
      badge = this.document.createElement('div');
      badge.setAttribute('aria-hidden', 'true');
      badge.setAttribute('role', 'presentation');
      badge.style.cssText = [
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

      this.ensurePositioned(stats.hostElement);
      stats.hostElement.appendChild(badge);
      this.badges.set(stats.hostElement, badge);
    }

    const isUnnecessary = stats.lastRenderKind === 'unnecessary';
    badge.style.background = isUnnecessary ? '#f44336' : '#ff9800';
    badge.textContent = String(stats.totalRenders);
    badge.title = `${stats.componentName}: ${stats.totalRenders} renders, ${stats.unnecessaryRenders} unnecessary`;
  }

  private ensurePositioned(el: Element): void {
    const htmlEl = el as HTMLElement;
    if (getComputedStyle(htmlEl).position === 'static') {
      htmlEl.style.position = 'relative';
    }
  }
}
