import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ComponentTracker } from '../services/component-tracker/component-tracker';
import { ScanConfigService } from '../services/scan-config/scan-config.service';

@Component({
  selector: 'angular-scan-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss',
  host: { '[style.display]': '"block"' },
})
export class ToolbarComponent {
  protected readonly tracker = inject(ComponentTracker);
  protected readonly config = inject(ScanConfigService);

  protected readonly expanded = signal(false);
  protected readonly settingsOpen = signal(false);

  protected toggleExpanded(): void {
    this.expanded.update((v) => !v);
    if (this.expanded()) {
      this.settingsOpen.set(false);
    }
  }

  protected toggleSettings(): void {
    this.settingsOpen.update((v) => !v);
    if (this.settingsOpen()) {
      this.expanded.set(false);
    }
  }

  protected toggleEnabled(): void {
    this.config.enabled.update((v) => !v);
  }

  protected toggleOverlay(): void {
    this.config.showOverlay.update((v) => !v);
  }

  protected toggleBadges(): void {
    this.config.showBadges.update((v) => !v);
  }

  protected resetStats(): void {
    this.tracker.reset();
  }

  protected onFlashDurationChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.config.flashDurationMs.set(value);
  }
}
