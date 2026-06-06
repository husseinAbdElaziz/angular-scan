import type { DetectionState, ScanOptions, TickSummary } from './settings';

export const NS = 'angular-scan';

export type PageInbound =
  | { ns: typeof NS; dir: 'in'; cmd: 'init'; payload: ScanOptions; id: string }
  | { ns: typeof NS; dir: 'in'; cmd: 'setOptions'; payload: Partial<ScanOptions>; id: string }
  | { ns: typeof NS; dir: 'in'; cmd: 'stop'; id: string }
  | { ns: typeof NS; dir: 'in'; cmd: 'reset'; id: string }
  | { ns: typeof NS; dir: 'in'; cmd: 'getReport'; id: string }
  | { ns: typeof NS; dir: 'in'; cmd: 'highlight'; componentId: string; id: string };

export type PageOutbound =
  | { ns: typeof NS; dir: 'out'; cmd: 'detected'; payload: DetectionState }
  | { ns: typeof NS; dir: 'out'; cmd: 'tick'; payload: TickSummary }
  | { ns: typeof NS; dir: 'out'; cmd: 'report'; payload: ComponentReport[]; id: string }
  | { ns: typeof NS; dir: 'out'; cmd: 'ack'; id: string };

export interface SourceLocation {
  file?: string;
  line?: number;
  column?: number;
}

export interface ComponentReport {
  id: string;
  name: string;
  renders: number;
  wasted: number;
  rps5s: number;
  rpsPeak: number;
  sourceLocation: SourceLocation | null;
}

export type BgInbound =
  | { type: 'getTabState' }
  | { type: 'setEnabled'; enabled: boolean }
  | { type: 'setOptions'; patch: Partial<ScanOptions> }
  | { type: 'getReport' }
  | { type: 'reportResult'; id: string; report: ComponentReport[] }
  | { type: 'highlight'; componentId: string }
  | { type: 'reset' }
  | { type: 'detected'; state: DetectionState }
  | { type: 'tick'; summary: TickSummary };

export interface BgTabStateResponse {
  detected: DetectionState;
  options: ScanOptions;
  lastSummary?: TickSummary;
}

/** A tab where Angular Scan is active, surfaced to the report reader's tab picker. */
export interface ScanTabInfo {
  tabId: number;
  title: string;
  url: string;
  host: string | null;
  detected: DetectionState;
  lastSummary?: TickSummary;
}

export interface ScanTabsResponse {
  ok: boolean;
  tabs: ScanTabInfo[];
}

export function isPageOutbound(value: unknown): value is PageOutbound {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { ns?: unknown }).ns === NS &&
    (value as { dir?: unknown }).dir === 'out'
  );
}
