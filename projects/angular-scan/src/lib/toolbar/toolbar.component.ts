import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  afterRenderEffect,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ComponentTracker } from '../services/component-tracker/component-tracker';
import { ScanConfigService } from '../services/scan-config/scan-config.service';
import { clampFloatingPanelToViewport } from '../utils/floating-panel-clamp/floating-panel-clamp';
import { FloatingPanelDrag } from '../utils/floating-panel-drag/floating-panel-drag';
import {
  DEFAULT_FLOATING_PANEL_MARGIN_PX,
  buildFloatingPanelHostStyles,
} from '../utils/floating-panel-host-styles/floating-panel-host-styles';
import {
  ToolbarSettingToggleComponent,
  type ToolbarConfigToggleKey,
} from './toolbar-setting-toggle.component';

type PanelSection = 'expanded' | 'settings';

type ToolbarAction =
  | 'toggle-enabled'
  | 'toggle-settings'
  | 'toggle-expanded'
  | 'reset-stats';

@Component({
  selector: 'angular-scan-toolbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ToolbarSettingToggleComponent],
  templateUrl: './toolbar.component.html',
  styleUrl: './toolbar.component.scss',
  host: {
    '[style]': 'hostStyles()',
    '(click)': 'onHostClick($event)',
    '(input)': 'onHostInput($event)',
    '(pointerdown)': 'onHostPointerDown($event)',
  },
})
export class ToolbarComponent {
  private readonly hostEl = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tracker = inject(ComponentTracker);
  protected readonly config = inject(ScanConfigService);

  protected readonly enabled = this.config.enabled;
  protected readonly showOverlay = this.config.showOverlay;
  protected readonly showBadges = this.config.showBadges;
  protected readonly flashDurationMs = this.config.flashDurationMs;

  protected readonly expanded = signal(false);
  protected readonly settingsOpen = signal(false);
  protected readonly dragPosition = signal<{ left: number; top: number } | null>(null);

  protected readonly settingToggles: ReadonlyArray<{ key: ToolbarConfigToggleKey; label: string }> = [
    { key: 'enabled', label: 'Enable scanning' },
    { key: 'showOverlay', label: 'Flash overlay' },
    { key: 'showBadges', label: 'Render badges' },
  ];

  protected readonly hostStyles = computed(() =>
    buildFloatingPanelHostStyles(this.dragPosition(), DEFAULT_FLOATING_PANEL_MARGIN_PX),
  );

  protected readonly scanningPausedTitle = computed(() =>
    this.enabled() ? 'Pause scanning' : 'Resume scanning',
  );

  protected readonly scanningToggleIcon = computed(() => (this.enabled() ? '⏸' : '▶'));

  protected readonly expandInspectorTitle = computed(() =>
    this.expanded() ? 'Collapse inspector' : 'Expand inspector',
  );

  protected readonly expandInspectorIcon = computed(() => (this.expanded() ? '▼' : '▲'));

  protected readonly flashDurationText = computed(() => `${this.flashDurationMs()}ms`);

  protected readonly showWastedWarning = computed(() => this.tracker.totalUnnecessary() > 0);

  private readonly panelDrag: FloatingPanelDrag;

  private readonly toolbarActions: Record<ToolbarAction, () => void> = {
    'toggle-enabled': () => this.enabled.update((value) => !value),
    'toggle-settings': () => this.togglePanel('settings'),
    'toggle-expanded': () => this.togglePanel('expanded'),
    'reset-stats': () => this.tracker.reset(),
  };

  constructor() {
    this.panelDrag = new FloatingPanelDrag({
      host: this.hostEl.nativeElement,
      getPosition: () => this.dragPosition(),
      setPosition: (position) => this.dragPosition.set(position),
    });
    this.destroyRef.onDestroy(() => this.panelDrag.destroy());

    afterRenderEffect(() => {
      this.expanded();
      this.settingsOpen();
      this.ensurePanelInViewport();
    });
  }

  protected onHostClick(event: Event): void {
    const action = (event.target as HTMLElement).closest('[data-toolbar-action]')?.getAttribute(
      'data-toolbar-action',
    ) as ToolbarAction | null;
    if (!action) {
      return;
    }
    this.toolbarActions[action]();
  }

  protected onHostInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.dataset['toolbarInput'] !== 'flash-duration') {
      return;
    }
    this.flashDurationMs.set(Number(input.value));
  }

  protected onHostPointerDown(event: PointerEvent): void {
    if (!(event.target as HTMLElement).closest('[data-toolbar-drag-handle]')) {
      return;
    }
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    this.panelDrag.onPointerDown(event);
  }

  private togglePanel(section: PanelSection): void {
    const target = section === 'expanded' ? this.expanded : this.settingsOpen;
    const other = section === 'expanded' ? this.settingsOpen : this.expanded;
    target.update((value) => !value);
    if (target()) {
      other.set(false);
    }
  }

  private ensurePanelInViewport(): void {
    const host = this.hostEl.nativeElement;
    const rect = host.getBoundingClientRect();
    const current = this.dragPosition() ?? { left: rect.left, top: rect.top };
    const clamped = clampFloatingPanelToViewport(rect, current, DEFAULT_FLOATING_PANEL_MARGIN_PX);

    if (
      Math.abs(clamped.left - current.left) > 0.5 ||
      Math.abs(clamped.top - current.top) > 0.5
    ) {
      this.dragPosition.set(clamped);
    }
  }
}
