export interface ScanOptions {
  enabled: boolean;
  showOverlay: boolean;
  showBadges: boolean;
  flashDurationMs: number;
  log: boolean;
}

export const DEFAULT_OPTIONS: ScanOptions = {
  enabled: false,
  showOverlay: true,
  showBadges: true,
  flashDurationMs: 500,
  log: false,
};

export interface TickSummary {
  tickId: number;
  checked: number;
  rendered: number;
  unnecessary: number;
  durationMs: number;
}

export interface DetectionState {
  mode: 'yes' | 'prod' | 'no' | 'unknown';
  angularVersion?: string;
}

export const STORAGE_KEYS = {
  origin: (host: string) => `origin:${host}`,
  defaults: 'defaults',
} as const;
