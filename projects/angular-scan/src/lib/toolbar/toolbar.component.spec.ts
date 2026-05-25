import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ComponentTracker } from '../services/component-tracker/component-tracker';
import { makeComponentStats } from '../services/component-tracker/component-tracker.fixtures';
import { ScanConfigService } from '../services/scan-config/scan-config.service';
import { ANGULAR_SCAN_OPTIONS } from '../tokens';
import { ToolbarComponent } from './toolbar.component';

function clickAction(fixture: ComponentFixture<ToolbarComponent>, action: string): void {
  const button = (fixture.nativeElement as HTMLElement).querySelector(
    `[data-toolbar-action="${action}"]`,
  );
  button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('ToolbarComponent', () => {
  let fixture: ComponentFixture<ToolbarComponent>;
  let component: ToolbarComponent;
  let tracker: ComponentTracker;
  let config: ScanConfigService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToolbarComponent],
      providers: [{ provide: ANGULAR_SCAN_OPTIONS, useValue: {} }],
    }).compileComponents();

    fixture = TestBed.createComponent(ToolbarComponent);
    component = fixture.componentInstance;
    tracker = TestBed.inject(ComponentTracker);
    config = TestBed.inject(ScanConfigService);
    fixture.detectChanges();
  });

  it('creates the component', () => {
    expect(component).toBeTruthy();
  });

  it('renders total checks and wasted counts from tracker signals', async () => {
    tracker.recordRender({}, document.createElement('div'), 'render');
    tracker.recordRender({}, document.createElement('span'), 'unnecessary');
    fixture.detectChanges();
    await fixture.whenStable();
    const values = (fixture.nativeElement as HTMLElement).querySelectorAll('.toolbar__stat-value');
    expect(values[0].textContent?.trim()).toBe('2');
    expect(values[1].textContent?.trim()).toBe('1');
  });

  describe('panel toggles', () => {
    it('toggles the expanded signal', () => {
      expect(component['expanded']()).toBe(false);
      clickAction(fixture, 'toggle-expanded');
      expect(component['expanded']()).toBe(true);
      clickAction(fixture, 'toggle-expanded');
      expect(component['expanded']()).toBe(false);
    });

    it('closes settings when expanding', () => {
      component['settingsOpen'].set(true);
      clickAction(fixture, 'toggle-expanded');
      expect(component['settingsOpen']()).toBe(false);
    });

    it('toggles the settingsOpen signal', () => {
      expect(component['settingsOpen']()).toBe(false);
      clickAction(fixture, 'toggle-settings');
      expect(component['settingsOpen']()).toBe(true);
    });

    it('closes expanded when opening settings', () => {
      component['expanded'].set(true);
      clickAction(fixture, 'toggle-settings');
      expect(component['expanded']()).toBe(false);
    });

    it('repositions the panel when expanding near the bottom of the viewport', async () => {
      vi.stubGlobal('innerWidth', 1000);
      vi.stubGlobal('innerHeight', 800);

      const host = fixture.nativeElement as HTMLElement;
      Object.defineProperty(host, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ left: 700, top: 700, width: 200, height: 200, right: 900, bottom: 900 }),
      });

      component['dragPosition'].set({ left: 700, top: 700 });
      clickAction(fixture, 'toggle-expanded');
      fixture.detectChanges();
      await fixture.whenStable();

      expect(component['dragPosition']()).toEqual({ left: 700, top: 584 });
      vi.unstubAllGlobals();
    });
  });

  describe('config toggles', () => {
    it('flips config.enabled from the header action', () => {
      const before = config.enabled();
      clickAction(fixture, 'toggle-enabled');
      expect(config.enabled()).toBe(!before);
    });
  });

  describe('reset stats', () => {
    it('resets tracker totals to zero', () => {
      tracker.recordRender({}, document.createElement('div'), 'render');
      component['settingsOpen'].set(true);
      fixture.detectChanges();
      clickAction(fixture, 'reset-stats');
      expect(tracker.totalRenders()).toBe(0);
    });
  });

  describe('flash duration input', () => {
    it('updates config.flashDurationMs from the range input', () => {
      component['settingsOpen'].set(true);
      fixture.detectChanges();
      const input = (fixture.nativeElement as HTMLElement).querySelector(
        '[data-toolbar-input="flash-duration"]',
      ) as HTMLInputElement;
      input.value = '1200';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      expect(config.flashDurationMs()).toBe(1200);
    });
  });

  describe('template', () => {
    it.each([
      { action: 'toggle-expanded', selector: '.toolbar__inspector' },
      { action: 'toggle-settings', selector: '.toolbar__settings' },
    ])('shows $selector after $action', async ({ action, selector }) => {
      clickAction(fixture, action);
      fixture.detectChanges();
      await fixture.whenStable();
      expect((fixture.nativeElement as HTMLElement).querySelector(selector)).not.toBeNull();
    });

    it('hides .toolbar__inspector and .toolbar__settings by default', () => {
      const el = fixture.nativeElement as HTMLElement;
      expect(el.querySelector('.toolbar__inspector')).toBeNull();
      expect(el.querySelector('.toolbar__settings')).toBeNull();
    });
  });

  it('fixture helper makeComponentStats produces valid ComponentStats shape', () => {
    const stats = makeComponentStats();
    expect(stats.componentName).toBe('TestComponent');
  });
});
