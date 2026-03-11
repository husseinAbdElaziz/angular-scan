/** Options for configuring angular-scan. */
export interface AngularScanOptions {
  /** Set to false to disable scanning entirely. Default: true. */
  enabled?: boolean;
  /** Duration of the canvas flash in milliseconds. Default: 500. */
  flashDurationMs?: number;
  /** Show render count badges on component host elements. Default: true. */
  showBadges?: boolean;
  /** Show the floating toolbar HUD. Default: true. */
  showToolbar?: boolean;
}
