import { Injectable, inject, signal } from '@angular/core';
import { ANGULAR_SCAN_OPTIONS } from './tokens';

@Injectable({ providedIn: 'root' })
export class ScanConfigService {
  private readonly options = inject(ANGULAR_SCAN_OPTIONS);

  readonly enabled = signal(this.options.enabled !== false);
  readonly showOverlay = signal(true);
  readonly showBadges = signal(this.options.showBadges !== false);
  readonly flashDurationMs = signal(this.options.flashDurationMs ?? 500);
}
