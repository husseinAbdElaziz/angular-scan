import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ScanConfigService } from '../services/scan-config/scan-config.service';

export type ToolbarConfigToggleKey = 'enabled' | 'showOverlay' | 'showBadges';

@Component({
  selector: 'angular-scan-toolbar-setting',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './toolbar-setting-toggle.component.scss',
  host: {
    class: 'toolbar__setting',
    '(click)': 'onToggle($event)',
  },
  template: `
    <span class="toolbar__setting-label">{{ label() }}</span>
    <button
      class="toolbar__toggle"
      type="button"
      role="switch"
      [attr.aria-checked]="isOn()"
      [class.toolbar__toggle--on]="isOn()"
    >{{ isOn() ? 'ON' : 'OFF' }}</button>
  `,
})
export class ToolbarSettingToggleComponent {
  readonly label = input.required<string>();
  readonly configKey = input.required<ToolbarConfigToggleKey>();

  private readonly config = inject(ScanConfigService);

  protected readonly isOn = computed(() => this.config[this.configKey()]());

  protected onToggle(event: Event): void {
    event.preventDefault();
    this.config[this.configKey()].update((value) => !value);
  }
}
