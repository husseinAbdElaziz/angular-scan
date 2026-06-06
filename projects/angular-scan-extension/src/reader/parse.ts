import type { ComponentReport, SourceLocation } from '@shared/messages';

export interface LoadedReport {
  origin: 'file' | 'live';
  label: string;
  generatedAt?: string;
  rows: ComponentReport[];
}

export interface ReportSummary {
  components: number;
  totalRenders: number;
  totalWasted: number;
  wastedPct: number;
  peakRate: number;
  withSourcePct: number;
}

/** Parse a downloaded report file (JSON or CSV) into the common row shape.
 * Mirrors the popup's `exportJson` / `exportCsv` formats. Throws on malformed input. */
export function parseReportFile(name: string, text: string): LoadedReport {
  const trimmed = text.trim();
  const looksJson = /\.json$/i.test(name) || trimmed.startsWith('{') || trimmed.startsWith('[');
  const parsed = looksJson ? parseJson(trimmed) : parseCsv(trimmed);
  return { origin: 'file', label: name, generatedAt: parsed.generatedAt, rows: parsed.rows };
}

function parseJson(text: string): { rows: ComponentReport[]; generatedAt?: string } {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Not valid JSON.');
  }
  // Accept either the export envelope { generatedAt, report: [...] } or a bare array.
  const envelope = data as { report?: unknown; generatedAt?: unknown };
  const rawRows = Array.isArray(data) ? data : envelope?.report;
  if (!Array.isArray(rawRows)) throw new Error('JSON has no "report" array.');
  const generatedAt = typeof envelope?.generatedAt === 'string' ? envelope.generatedAt : undefined;
  return { rows: rawRows.map(coerceRow), generatedAt };
}

function coerceRow(raw: unknown, i: number): ComponentReport {
  const r = (raw ?? {}) as Record<string, unknown>;
  const loc = r.sourceLocation as SourceLocation | null | undefined;
  return {
    id: str(r.id) || `r${i}`,
    name: str(r.name) || 'Unknown',
    renders: num(r.renders),
    wasted: num(r.wasted),
    rps5s: num(r.rps5s),
    rpsPeak: num(r.rpsPeak),
    sourceLocation: loc?.file ? { file: String(loc.file), ...optLine(loc.line), ...optCol(loc.column) } : null,
  };
}

function parseCsv(text: string): { rows: ComponentReport[]; generatedAt?: string } {
  const records = parseCsvRecords(text);
  if (records.length < 2) throw new Error('CSV has no data rows.');
  const header = records[0].map((h) => h.trim());
  const col = (name: string) => header.indexOf(name);
  const ci = {
    id: col('id'),
    name: col('name'),
    renders: col('renders'),
    wasted: col('wasted'),
    rps5s: col('rps5s'),
    rpsPeak: col('rpsPeak'),
    sourceFile: col('sourceFile'),
    sourceLine: col('sourceLine'),
  };
  if (ci.name === -1) throw new Error('CSV missing a "name" column.');

  const rows: ComponentReport[] = [];
  for (let i = 1; i < records.length; i++) {
    const f = records[i];
    if (f.length === 1 && f[0] === '') continue; // trailing blank line
    const file = deTab(at(f, ci.sourceFile));
    const line = Number(at(f, ci.sourceLine));
    rows.push({
      id: at(f, ci.id) || `r${i}`,
      name: deTab(at(f, ci.name)) || 'Unknown',
      renders: num(at(f, ci.renders)),
      wasted: num(at(f, ci.wasted)),
      rps5s: num(at(f, ci.rps5s)),
      rpsPeak: num(at(f, ci.rpsPeak)),
      sourceLocation: file ? { file, ...(Number.isFinite(line) && line > 0 ? { line } : {}) } : null,
    });
  }
  return { rows };
}

/** RFC-4180-ish CSV: handles quoted fields with embedded commas, newlines and "" escapes. */
function parseCsvRecords(text: string): string[][] {
  const records: string[][] = [];
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      record.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      record.push(field);
      records.push(record);
      field = '';
      record = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || record.length > 0) {
    record.push(field);
    records.push(record);
  }
  return records;
}

export function summarize(rows: ComponentReport[]): ReportSummary {
  const components = rows.length;
  let totalRenders = 0;
  let totalWasted = 0;
  let peakRate = 0;
  let withSource = 0;
  for (const r of rows) {
    totalRenders += r.renders;
    totalWasted += r.wasted;
    if (r.rpsPeak > peakRate) peakRate = r.rpsPeak;
    if (r.sourceLocation?.file) withSource++;
  }
  return {
    components,
    totalRenders,
    totalWasted,
    wastedPct: totalRenders > 0 ? Math.round((totalWasted / totalRenders) * 100) : 0,
    peakRate,
    withSourcePct: components > 0 ? Math.round((withSource / components) * 100) : 0,
  };
}

// --- helpers ---
function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}
function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}
function at(arr: string[], i: number): string {
  return i >= 0 && i < arr.length ? arr[i] : '';
}
// `exportCsv` prefixes a leading =,+,-,@ with a TAB to neutralize formula injection.
function deTab(v: string): string {
  return v.startsWith('\t') ? v.slice(1) : v;
}
function optLine(line: unknown): { line?: number } {
  return typeof line === 'number' ? { line } : {};
}
function optCol(column: unknown): { column?: number } {
  return typeof column === 'number' ? { column } : {};
}
