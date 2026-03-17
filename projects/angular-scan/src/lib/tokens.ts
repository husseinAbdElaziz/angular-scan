import { DOCUMENT } from '@angular/common';
import { InjectionToken, inject } from '@angular/core';
import type { AngularScanOptions } from './models/AngularScanOptions';
import type { BrowserWindow } from './models/BrowserWindow';

export const ANGULAR_SCAN_OPTIONS = new InjectionToken<AngularScanOptions>('ANGULAR_SCAN_OPTIONS', {
  providedIn: 'root',
  factory: () => ({}),
});

/** The browser Window object. Resolves to null in SSR. */
export const WINDOW = new InjectionToken<BrowserWindow | null>('WINDOW', {
  providedIn: 'root',
  factory: () => inject(DOCUMENT).defaultView,
});
