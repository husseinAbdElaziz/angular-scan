/** Angular profiler event IDs — stable dev-mode contract, same as Angular DevTools. */
export const PROFILER_EVENTS = {
  TemplateUpdateStart: 2,
  ChangeDetectionStart: 12,
  ChangeDetectionEnd: 13,
  ChangeDetectionSyncStart: 14,
  ChangeDetectionSyncEnd: 15,
} as const;
