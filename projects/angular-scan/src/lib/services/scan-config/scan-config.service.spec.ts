import { TestBed } from '@angular/core/testing';
import { ANGULAR_SCAN_OPTIONS } from '../../tokens';
import { ScanConfigService } from './scan-config.service';
import type { AngularScanOptions } from '../../models/AngularScanOptions';

function setup(options: AngularScanOptions = {}) {
  TestBed.configureTestingModule({
    providers: [{ provide: ANGULAR_SCAN_OPTIONS, useValue: options }],
  });
  return TestBed.inject(ScanConfigService);
}

describe('ScanConfigService', () => {
  it.each([
    { options: {} as AngularScanOptions, expected: true },
    { options: { enabled: false }, expected: false },
  ])('enabled is $expected when options.enabled is $options.enabled', ({ options, expected }) => {
    expect(setup(options).enabled()).toBe(expected);
  });

  it('showOverlay defaults to true regardless of options', () => {
    expect(setup().showOverlay()).toBe(true);
  });

  it.each([
    { options: {} as AngularScanOptions, expected: true },
    { options: { showBadges: false }, expected: false },
  ])('showBadges is $expected when options.showBadges is $options.showBadges', ({ options, expected }) => {
    expect(setup(options).showBadges()).toBe(expected);
  });

  it.each([
    { options: {} as AngularScanOptions, expected: 500 },
    { options: { flashDurationMs: 1000 }, expected: 1000 },
  ])('flashDurationMs is $expected when options.flashDurationMs is $options.flashDurationMs', ({ options, expected }) => {
    expect(setup(options).flashDurationMs()).toBe(expected);
  });
});
