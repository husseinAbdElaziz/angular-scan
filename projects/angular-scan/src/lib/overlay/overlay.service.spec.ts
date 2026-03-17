import { TestBed } from '@angular/core/testing';
import { makeComponentStats } from '../services/component-tracker/component-tracker.fixtures';
import { ScanConfigService } from '../services/scan-config/scan-config.service';
import { ANGULAR_SCAN_OPTIONS } from '../tokens';
import { OverlayService } from './overlay.service';

describe('OverlayService', () => {
  let svc: OverlayService;
  let config: ScanConfigService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: ANGULAR_SCAN_OPTIONS, useValue: {} }],
    });
    svc = TestBed.inject(OverlayService);
    config = TestBed.inject(ScanConfigService);
  });

  describe('onComponentChecked — badge lifecycle', () => {
    it('creates a badge when showBadges is true', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      svc.onComponentChecked(makeComponentStats({ hostElement: el }));

      expect(el.querySelector('div')).not.toBeNull();
      el.remove();
    });

    it('sets the badge title with component name and render counts', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      svc.onComponentChecked(
        makeComponentStats({ hostElement: el, componentName: 'MyComp', totalRenders: 3, unnecessaryRenders: 1 }),
      );

      expect((el.querySelector('div') as HTMLElement).title).toBe('MyComp: 3 renders, 1 unnecessary');
      el.remove();
    });

    it('does not create a badge when showBadges is false', () => {
      config.showBadges.set(false);
      const el = document.createElement('div');
      document.body.appendChild(el);

      svc.onComponentChecked(makeComponentStats({ hostElement: el }));

      expect(el.querySelector('div')).toBeNull();
      el.remove();
    });

    it('removes an existing badge when showBadges is toggled off', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      svc.onComponentChecked(makeComponentStats({ hostElement: el }));
      config.showBadges.set(false);
      svc.onComponentChecked(makeComponentStats({ hostElement: el }));

      expect(el.querySelector('div')).toBeNull();
      el.remove();
    });
  });

  describe('removeBadge', () => {
    it('removes the badge for the given element', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      svc.onComponentChecked(makeComponentStats({ hostElement: el }));
      svc.removeBadge(el);

      expect(el.querySelector('div')).toBeNull();
      el.remove();
    });

    it('is a no-op for elements without a badge', () => {
      expect(() => svc.removeBadge(document.createElement('div'))).not.toThrow();
    });
  });

  describe('destroy', () => {
    it('removes all badges from the DOM', () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('span');
      document.body.append(el1, el2);

      svc.onComponentChecked(makeComponentStats({ hostElement: el1 }));
      svc.onComponentChecked(makeComponentStats({ hostElement: el2 }));
      svc.destroy();

      expect(el1.querySelector('div')).toBeNull();
      expect(el2.querySelector('div')).toBeNull();
      el1.remove();
      el2.remove();
    });
  });
});
