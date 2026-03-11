/**
 * Angular profiler event IDs — stable dev-mode contract, same as Angular DevTools.
 *
 * @see https://github.com/angular/angular/blob/main/packages/core/primitives/devtools/src/profiler_types.ts
 * @see https://github.com/angular/angular/blob/main/devtools/projects/ng-devtools-backend/src/lib/hooks/capture.ts
 */
export const PROFILER_EVENTS = {
  TemplateUpdateStart: 2,
  ChangeDetectionStart: 12,
  ChangeDetectionEnd: 13,
  ChangeDetectionSyncStart: 14,
  ChangeDetectionSyncEnd: 15,
} as const;
