# Changelog

## [1.0.0] - 2026-03-18

### Added

- SSR support: `provideAngularScan()` is now a no-op on the server — uses `isPlatformBrowser` to skip all canvas, DOM, and scanner initialization during server-side rendering
- Unit tests covering core services, overlay, scanner, and toolbar components

### Changed

- Restructured project layout for better separation of concerns between services, overlay, toolbar, and models

## [0.2.3] - 2026-03-17

### Security

- Updated Angular dependencies to fix XSS vulnerability ([XSS in i18n attribute bindings
](https://github.com/angular/angular/security/advisories/GHSA-g93w-mfhg-p222))

## [0.2.2] - 2026-03-17

### Fixed

- Added missing package metadata: description, author, license, repository, homepage, bugs, and keywords

## [0.2.1] - 2026-03-17

### Fixed

- Reduced library bundle size by removing GIF from assets

## [0.2.0] - 2026-03-17

### Added

- Initial public release with live demo
