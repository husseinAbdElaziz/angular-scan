import { InjectionToken, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import type { AngularScanOptions } from './models/AngularScanOptions';

export const ANGULAR_SCAN_OPTIONS = new InjectionToken<AngularScanOptions>(
  'ANGULAR_SCAN_OPTIONS',
  { providedIn: 'root', factory: () => ({}) }
);

/** The browser Window object. Resolves to null in SSR. */
export const WINDOW = new InjectionToken<(Window & typeof globalThis) | null>(
  'WINDOW',
  { providedIn: 'root', factory: () => inject(DOCUMENT).defaultView }
);
