import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
} from '@angular/core';
import { ComponentTracker } from '../component-tracker';
import { ScanConfigService } from '../scan-config.service';

@Component({
  selector: 'angular-scan-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './toolbar.component.html',
  styleUrls: ['./toolbar.component.scss'],
  host: { '[style.display]': '"block"' },
})
export class ToolbarComponent {
  protected readonly tracker = inject(ComponentTracker);
  protected readonly config = inject(ScanConfigService);

  protected readonly expanded = signal(false);
  protected readonly settingsOpen = signal(false);

  protected toggleExpanded(): void {
    this.expanded.set(!this.expanded());
    if (this.expanded()) this.settingsOpen.set(false);
  }

  protected toggleSettings(): void {
    this.settingsOpen.set(!this.settingsOpen());
    if (this.settingsOpen()) this.expanded.set(false);
  }

  protected toggleEnabled(): void {
    this.config.enabled.set(!this.config.enabled());
  }

  protected toggleOverlay(): void {
    this.config.showOverlay.set(!this.config.showOverlay());
  }

  protected toggleBadges(): void {
    this.config.showBadges.set(!this.config.showBadges());
  }

  protected resetStats(): void {
    this.tracker.reset();
  }

  protected onFlashDurationChange(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.config.flashDurationMs.set(value);
  }
}
