import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideAngularScan } from 'angular-scan';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideAngularScan({ showBadges: true, showToolbar: true }),
  ],
};
