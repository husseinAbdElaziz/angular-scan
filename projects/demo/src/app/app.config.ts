import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAngularScan } from 'angular-scan';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAngularScan({ showBadges: true, showToolbar: true }),
    provideClientHydration(withEventReplay()),
  ],
};
