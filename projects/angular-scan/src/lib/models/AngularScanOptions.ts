/** Options for configuring angular-scan. */
export interface AngularScanOptions {
  /** Start with scanning paused. The toolbar can turn it on unless `showToolbar` is false. Default: true. */
  enabled?: boolean;
  /** Duration of the canvas flash in milliseconds. Default: 500. */
  flashDurationMs?: number;
  /** Show render count badges on component host elements. Default: true. */
  showBadges?: boolean;
  /** Show the floating toolbar HUD. Default: true. */
  showToolbar?: boolean;
}
