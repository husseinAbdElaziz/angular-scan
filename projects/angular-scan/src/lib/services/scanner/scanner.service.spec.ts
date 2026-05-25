import { TestBed } from '@angular/core/testing';
import type { BrowserWindow } from '../../models/BrowserWindow';
import { OverlayService } from '../../overlay/overlay.service';
import { ScanConfigService } from '../scan-config/scan-config.service';
import { ANGULAR_SCAN_OPTIONS, WINDOW } from '../../tokens';
import { ScannerService } from './scanner.service';

type WindowWithNg = BrowserWindow & { ng?: unknown };

function setup(
  options: Record<string, unknown> = {},
  win: BrowserWindow | null = window,
) {
  TestBed.configureTestingModule({
    providers: [
      { provide: ANGULAR_SCAN_OPTIONS, useValue: options },
      { provide: WINDOW, useValue: win },
    ],
  });
  return TestBed.inject(ScannerService);
}

describe('ScannerService', () => {
  let originalNg: unknown;

  beforeEach(() => {
    originalNg = (window as WindowWithNg).ng;
  });

  afterEach(() => {
    if (originalNg === undefined) {
      delete (window as WindowWithNg).ng;
    } else {
      (window as WindowWithNg).ng = originalNg;
    }
  });

  describe('setToolbar', () => {
    it('stores the toolbar instance and host without throwing', () => {
      const svc = setup();
      const host = document.createElement('angular-scan-toolbar');
      expect(() => svc.setToolbar({}, host)).not.toThrow();
    });
  });

  describe('initialize', () => {
    it('is a no-op when WINDOW is null (SSR)', () => {
      const svc = setup({}, null);
      delete (window as WindowWithNg).ng;
      expect(() => svc.initialize()).not.toThrow();
    });

    it('starts with scanning disabled when options.enabled is false', () => {
      setup({ enabled: false });
      expect(TestBed.inject(ScanConfigService).enabled()).toBe(false);
    });

    it('warns when the Angular debug API (window.ng) is absent', () => {
      const svc = setup();
      delete (window as WindowWithNg).ng;
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      svc.initialize();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('[angular-scan]'));
      warn.mockRestore();
    });

    it('warns when options.enabled is false but window.ng is absent', () => {
      const svc = setup({ enabled: false });
      delete (window as WindowWithNg).ng;
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      svc.initialize();
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('[angular-scan]'));
      warn.mockRestore();
    });
  });

  describe('ngOnDestroy', () => {
    it('calls overlay.destroy()', () => {
      const svc = setup();
      const overlay = TestBed.inject(OverlayService);
      const spy = vi.spyOn(overlay, 'destroy');
      svc.ngOnDestroy();
      expect(spy).toHaveBeenCalledOnce();
    });

    it('can be called multiple times without throwing', () => {
      const svc = setup();
      expect(() => { svc.ngOnDestroy(); svc.ngOnDestroy(); }).not.toThrow();
    });
  });
});
