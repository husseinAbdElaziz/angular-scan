import { DOCUMENT, Injectable, inject, isDevMode } from '@angular/core';
import type { CanvasOverlay } from '../models/CanvasOverlay';
import type { ComponentStats } from '../models/ComponentStats';
import { ScanConfigService } from '../services/scan-config/scan-config.service';
import { ANGULAR_SCAN_OPTIONS, WINDOW } from '../tokens';
import { clearBadges, createOrUpdateBadge } from './badge';
import { createCanvasOverlay } from './canvas-overlay';

@Injectable({ providedIn: 'root' })
export class OverlayService {
  private readonly document = inject(DOCUMENT);
  private readonly win = inject(WINDOW);
  private readonly options = inject(ANGULAR_SCAN_OPTIONS);
  private readonly config = inject(ScanConfigService);

  private canvas: CanvasOverlay | null = null;
  private readonly badges = new Map<Element, HTMLElement>();

  initialize(): void {
    if (!isDevMode() || !this.win || this.options.enabled === false) {
      return;
    }
    this.canvas = createCanvasOverlay(this.document, this.win);
  }

  destroy(): void {
    this.canvas?.detach();
    this.canvas = null;
    clearBadges(this.badges);
  }

  onComponentChecked(stats: ComponentStats): void {
    if (this.config.showOverlay()) {
      this.canvas?.flash(stats.hostElement, stats.lastRenderKind, this.config.flashDurationMs());
    }

    if (this.config.showBadges()) {
      const badge = createOrUpdateBadge(
        this.badges,
        stats.hostElement,
        stats.totalRenders,
        stats.lastRenderKind,
        this.document,
        this.win,
      );
      badge.title = `${stats.componentName}: ${stats.totalRenders} renders, ${stats.unnecessaryRenders} unnecessary`;
    } else {
      this.removeBadge(stats.hostElement);
    }
  }

  removeBadge(el: Element): void {
    this.badges.get(el)?.remove();
    this.badges.delete(el);
  }
}
