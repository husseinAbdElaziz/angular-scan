import {
  EnvironmentProviders,
  makeEnvironmentProviders,
  isDevMode,
  provideEnvironmentInitializer,
  inject,
  ApplicationRef,
  createComponent,
  EnvironmentInjector,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ScannerService } from './scanner.service';
import { OverlayService } from './overlay/overlay.service';
import { ToolbarComponent } from './toolbar/toolbar.component';
import { ANGULAR_SCAN_OPTIONS } from './tokens';
import type { AngularScanOptions } from './types';

/**
 * Provides angular-scan for development-time render tracking.
 *
 * Add to your application providers:
 * ```ts
 * bootstrapApplication(AppComponent, {
 *   providers: [provideAngularScan()]
 * });
 * ```
 *
 * This is a complete no-op in production builds (`isDevMode() === false`),
 * so it can safely be left in your app config.
 */
export function provideAngularScan(options: AngularScanOptions = {}): EnvironmentProviders {
  // Return empty providers in production — entire library is tree-shaken
  if (!isDevMode()) {
    return makeEnvironmentProviders([]);
  }

  const resolvedOptions: AngularScanOptions = {
    enabled: true,
    flashDurationMs: 500,
    showBadges: true,
    showToolbar: true,
    ...options,
  };

  return makeEnvironmentProviders([
    {
      provide: ANGULAR_SCAN_OPTIONS,
      useValue: resolvedOptions,
    },
    provideEnvironmentInitializer(() => {
        const overlay = inject(OverlayService);
        const scanner = inject(ScannerService);
        const opts = inject(ANGULAR_SCAN_OPTIONS);

        overlay.initialize();
        scanner.initialize();

        if (opts.showToolbar !== false) {
          const injector = inject(EnvironmentInjector);
          const doc = inject(DOCUMENT);
          const appRef = inject(ApplicationRef);

          // Create the toolbar outside Angular's component tree so it doesn't
          // appear in CD tracking. Attach it to ApplicationRef so signals work.
          const toolbarRef = createComponent(ToolbarComponent, {
            environmentInjector: injector,
          });

          doc.body.appendChild(toolbarRef.location.nativeElement);
          appRef.attachView(toolbarRef.hostView);

          // Tell the scanner to ignore the toolbar's own renders
          scanner.setToolbarInstance(toolbarRef.instance);
        }
    }),
  ]);
}
