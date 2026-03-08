import { InjectionToken } from '@angular/core';
import type { AngularScanOptions } from './types';

export const ANGULAR_SCAN_OPTIONS = new InjectionToken<AngularScanOptions>(
  'ANGULAR_SCAN_OPTIONS',
  { providedIn: 'root', factory: () => ({}) }
);
