import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentTracker } from '../services/component-tracker/component-tracker';
import { makeComponentStats } from '../services/component-tracker/component-tracker.fixtures';
import { ScanConfigService } from '../services/scan-config/scan-config.service';
import { ANGULAR_SCAN_OPTIONS } from '../tokens';
import { ToolbarComponent } from './toolbar.component';

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

  describe('toggleExpanded', () => {
    it('toggles the expanded signal', () => {
      expect(component['expanded']()).toBe(false);
      component['toggleExpanded']();
      expect(component['expanded']()).toBe(true);
      component['toggleExpanded']();
      expect(component['expanded']()).toBe(false);
    });

    it('closes settings when expanding', () => {
      component['settingsOpen'].set(true);
      component['toggleExpanded']();
      expect(component['settingsOpen']()).toBe(false);
    });
  });

  describe('toggleSettings', () => {
    it('toggles the settingsOpen signal', () => {
      expect(component['settingsOpen']()).toBe(false);
      component['toggleSettings']();
      expect(component['settingsOpen']()).toBe(true);
    });

    it('closes expanded when opening settings', () => {
      component['expanded'].set(true);
      component['toggleSettings']();
      expect(component['expanded']()).toBe(false);
    });
  });

  type ConfigToggleRow = {
    method: 'toggleEnabled' | 'toggleOverlay' | 'toggleBadges';
    signal: 'enabled' | 'showOverlay' | 'showBadges';
  };

  describe('config toggles', () => {
    it.each([
      { method: 'toggleEnabled' as const, signal: 'enabled' as const },
      { method: 'toggleOverlay' as const, signal: 'showOverlay' as const },
      { method: 'toggleBadges' as const, signal: 'showBadges' as const },
    ] satisfies ConfigToggleRow[])('$method flips config.$signal', ({ method, signal }: ConfigToggleRow) => {
      const before = config[signal]();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component as any)[method]();
      expect(config[signal]()).toBe(!before);
    });
  });

  describe('resetStats', () => {
    it('resets tracker totals to zero', () => {
      tracker.recordRender({}, document.createElement('div'), 'render');
      component['resetStats']();
      expect(tracker.totalRenders()).toBe(0);
    });
  });

  describe('onFlashDurationChange', () => {
    it('updates config.flashDurationMs with the input value', () => {
      const event = { target: { value: '1200' } as HTMLInputElement } as unknown as Event;
      component['onFlashDurationChange'](event);
      expect(config.flashDurationMs()).toBe(1200);
    });
  });

  describe('template', () => {
    it.each([
      { method: 'toggleExpanded' as const, selector: '.toolbar__inspector' },
      { method: 'toggleSettings' as const, selector: '.toolbar__settings' },
    ])('shows $selector after $method is called', async ({ method, selector }: { method: 'toggleExpanded' | 'toggleSettings'; selector: string }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (component as any)[method]();
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

  // Silence unused import warning — makeComponentStats used to validate fixture export
  it('fixture helper makeComponentStats produces valid ComponentStats shape', () => {
    const stats = makeComponentStats();
    expect(stats.componentName).toBe('TestComponent');
  });
});
