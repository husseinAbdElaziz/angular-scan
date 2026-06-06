import { copyText } from '@shared/clipboard';
import type { BgInbound, BgTabStateResponse, ComponentReport } from '@shared/messages';
import type { ScanOptions } from '@shared/settings';

interface PopupQuery {
  type: 'popupQuery';
  tabId: number;
  payload?: BgInbound;
}

interface ReportResponse {
  ok: boolean;
  report?: ComponentReport[];
}

type SortKey = 'name' | 'renders' | 'wasted' | 'rps5s' | 'rpsPeak' | 'source';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const detection = $<HTMLElement>('detection');
const detectionText = detection.querySelector<HTMLElement>('.status__text');
const enabledInput = $<HTMLInputElement>('enabled');
const optOverlay = $<HTMLInputElement>('opt-overlay');
const optBadges = $<HTMLInputElement>('opt-badges');
const optLog = $<HTMLInputElement>('opt-log');
const optFlash = $<HTMLInputElement>('opt-flash');
const optFlashOut = $<HTMLOutputElement>('opt-flash-out');
const statChecks = $('stat-checks');
const statWasted = $('stat-wasted');
const statDuration = $('stat-duration');
const resetBtn = $<HTMLButtonElement>('reset');
const reportBody = $<HTMLTableSectionElement>('report-body');
const reportRefresh = $<HTMLButtonElement>('report-refresh');
const reportOpen = $<HTMLButtonElement>('report-open');
const reportExportJson = $<HTMLButtonElement>('report-export-json');
const reportExportCsv = $<HTMLButtonElement>('report-export-csv');
const reportSection = $<HTMLElement>('report-section');

let tabId: number | null = null;
let pollTimer: number | null = null;
let reportTimer: number | null = null;
let sortKey: SortKey = 'renders';
let sortDesc = true;
let latestReport: ComponentReport[] = [];
let toastEl: HTMLElement | null = null;
let toastTimer: number | null = null;

void boot();

async function boot(): Promise<void> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    setUnsupported('No active tab');
    return;
  }
  tabId = tab.id;
  await refresh();
  await refreshReport();
  wireInputs();
  wireReport();
  pollTimer = window.setInterval(refresh, 750);
  reportTimer = window.setInterval(refreshReport, 1500);
  window.addEventListener('unload', () => {
    if (pollTimer != null) clearInterval(pollTimer);
    if (reportTimer != null) clearInterval(reportTimer);
  });
}

async function refresh(): Promise<void> {
  if (tabId == null) return;
  const state = await query({ type: 'popupQuery', tabId });
  if (!state) {
    setUnsupported('Not connected');
    return;
  }
  applyState(state);
}

async function refreshReport(): Promise<void> {
  if (tabId == null) return;
  const response = await chrome.runtime
    .sendMessage<PopupQuery, ReportResponse>({ type: 'popupQuery', tabId, payload: { type: 'getReport' } })
    .catch(() => null);
  if (!response?.ok) return;
  latestReport = response.report ?? [];
  renderReport();
}

// Header Checks/Wasted are cumulative session totals. The tick summary only
// carries per-tick counts, so sum the report (the tracker is the cumulative
// source of truth) to keep the header consistent with the components table.
function updateTotals(): void {
  let checks = 0;
  let wasted = 0;
  for (const r of latestReport) {
    checks += r.renders;
    wasted += r.wasted;
  }
  statChecks.textContent = String(checks);
  statWasted.textContent = String(wasted);
}

function renderReport(): void {
  updateTotals();
  const rows = sortReport(latestReport, sortKey, sortDesc);
  reportSection.querySelectorAll<HTMLElement>('thead th').forEach((th) => {
    const active = th.dataset.sort === sortKey;
    th.classList.toggle('sorted', active);
    th.classList.toggle('asc', active && !sortDesc);
  });
  if (rows.length === 0) {
    reportBody.innerHTML = '<tr><td colspan="6" class="report__empty">No components tracked yet.</td></tr>';
    return;
  }
  reportBody.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const row of rows) {
    const tr = document.createElement('tr');
    tr.dataset.componentId = row.id;
    if (row.wasted > 0 && row.wasted > row.renders - row.wasted) tr.classList.add('wasted-heavy');
    appendNameCell(tr, row);
    appendCell(tr, String(row.renders), 'num');
    appendCell(tr, String(row.wasted), 'num wasted');
    appendCell(tr, row.rps5s.toFixed(2), 'num');
    appendCell(tr, row.rpsPeak.toFixed(2), 'num');
    appendCell(tr, formatSource(row), 'source', formatSourceTitle(row));
    frag.appendChild(tr);
  }
  reportBody.appendChild(frag);
}

function appendCell(tr: HTMLTableRowElement, text: string, className = '', title?: string): void {
  const td = document.createElement('td');
  if (className) td.className = className;
  td.textContent = text;
  if (title) td.title = title;
  tr.appendChild(td);
}

function appendNameCell(tr: HTMLTableRowElement, row: ComponentReport): void {
  const td = document.createElement('td');
  td.className = 'name';
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'name-link';
  btn.textContent = row.name;
  const hasSource = !!row.sourceLocation?.file;
  td.classList.toggle('no-source', !hasSource);
  btn.title = hasSource
    ? `Copy ${formatSourceTitle(row)}`
    : `Copy "${row.name}" — no source in this build (library component or build without Angular debug info)`;
  td.appendChild(btn);
  tr.appendChild(td);
}

function formatSource(row: ComponentReport): string {
  const loc = row.sourceLocation;
  if (!loc?.file) return '—';
  const file = loc.file.split('/').pop() ?? loc.file;
  return loc.line != null ? `${file}:${loc.line}` : file;
}

function formatSourceTitle(row: ComponentReport): string {
  const loc = row.sourceLocation;
  if (!loc?.file) return 'Source unavailable';
  return loc.line != null ? `${loc.file}:${loc.line}` : loc.file;
}

async function openSource(row: ComponentReport): Promise<void> {
  const loc = row.sourceLocation;
  const text = loc?.file ? (loc.line != null ? `${loc.file}:${loc.line}` : loc.file) : row.name;
  const ok = await copyText(text);
  if (!ok) {
    showToast('Copy failed');
  } else if (loc?.file) {
    showToast(`Copied ${text}`);
  } else {
    showToast(`Copied "${row.name}" — no source in this build`);
  }
}

function showToast(message: string): void {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.add('show');
  if (toastTimer != null) clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toastEl?.classList.remove('show'), 1800);
}

function sortReport(rows: ComponentReport[], key: SortKey, desc: boolean): ComponentReport[] {
  const dir = desc ? -1 : 1;
  return [...rows].sort((a, b) => {
    if (key === 'source') {
      const av = a.sourceLocation?.file ?? '';
      const bv = b.sourceLocation?.file ?? '';
      return av.localeCompare(bv) * dir;
    }
    if (key === 'name') return a.name.localeCompare(b.name) * dir;
    return ((a[key] as number) - (b[key] as number)) * dir;
  });
}

function applyState(state: BgTabStateResponse): void {
  detection.classList.remove('status--yes', 'status--prod', 'status--no', 'status--unknown');
  let cls: string;
  let text: string;
  switch (state.detected.mode) {
    case 'yes':
      cls = 'status--yes';
      text = `Angular${state.detected.angularVersion ? ` ${state.detected.angularVersion}` : ''} (dev)`;
      break;
    case 'prod':
      cls = 'status--prod';
      text = 'Production build — scan unavailable';
      break;
    case 'no':
      cls = 'status--no';
      text = 'No Angular detected';
      break;
    default:
      cls = 'status--unknown';
      text = 'Detecting…';
  }
  detection.classList.add(cls);
  if (detectionText) detectionText.textContent = text;

  const o = state.options;
  enabledInput.checked = o.enabled;
  enabledInput.disabled = state.detected.mode !== 'yes';
  optOverlay.checked = o.showOverlay;
  optBadges.checked = o.showBadges;
  optLog.checked = o.log;
  optFlash.value = String(o.flashDurationMs);
  optFlashOut.value = String(o.flashDurationMs);
  document.body.dataset.disabled = String(!o.enabled || state.detected.mode !== 'yes');

  const s = state.lastSummary;
  statDuration.textContent = s ? s.durationMs.toFixed(1) : '0';
  updateTotals();
}

function wireInputs(): void {
  enabledInput.addEventListener('change', () => {
    void send({ type: 'setEnabled', enabled: enabledInput.checked });
  });
  optOverlay.addEventListener('change', () => sendPatch({ showOverlay: optOverlay.checked }));
  optBadges.addEventListener('change', () => sendPatch({ showBadges: optBadges.checked }));
  optLog.addEventListener('change', () => sendPatch({ log: optLog.checked }));
  optFlash.addEventListener('input', () => {
    optFlashOut.value = optFlash.value;
  });
  optFlash.addEventListener('change', () => sendPatch({ flashDurationMs: Number(optFlash.value) }));
  resetBtn.addEventListener('click', () => {
    void send({ type: 'reset' });
    latestReport = [];
    renderReport();
  });
}

function wireReport(): void {
  reportSection.querySelectorAll<HTMLElement>('thead th').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort as SortKey | undefined;
      if (!key) return;
      if (sortKey === key) sortDesc = !sortDesc;
      else {
        sortKey = key;
        sortDesc = key !== 'name' && key !== 'source';
      }
      renderReport();
    });
  });
  reportBody.addEventListener('click', (e) => {
    const tr = (e.target as HTMLElement).closest<HTMLTableRowElement>('tr[data-component-id]');
    if (!tr) return;
    const componentId = tr.dataset.componentId;
    if (!componentId) return;
    if ((e.target as HTMLElement).closest('.name-link')) {
      const row = latestReport.find((r) => r.id === componentId);
      if (row) void openSource(row);
      return;
    }
    void send({ type: 'highlight', componentId });
  });
  reportRefresh.addEventListener('click', () => void refreshReport());
  reportOpen.addEventListener('click', () => {
    void chrome.tabs.create({ url: chrome.runtime.getURL('src/reader/reader.html') });
  });
  reportExportJson.addEventListener('click', exportJson);
  reportExportCsv.addEventListener('click', exportCsv);
}

function exportJson(): void {
  const payload = {
    generatedAt: new Date().toISOString(),
    tabId,
    report: latestReport,
  };
  download(`angular-scan-report-${Date.now()}.json`, JSON.stringify(payload, null, 2), 'application/json');
}

function exportCsv(): void {
  const headers = ['id', 'name', 'renders', 'wasted', 'rps5s', 'rpsPeak', 'sourceFile', 'sourceLine'];
  const lines = [headers.join(',')];
  for (const r of latestReport) {
    lines.push(
      [
        r.id,
        csvEscape(r.name),
        r.renders,
        r.wasted,
        r.rps5s,
        r.rpsPeak,
        csvEscape(r.sourceLocation?.file ?? ''),
        r.sourceLocation?.line ?? '',
      ].join(','),
    );
  }
  download(`angular-scan-report-${Date.now()}.csv`, lines.join('\n'), 'text/csv');
}

function csvEscape(value: string): string {
  if (!value) return '';
  // Neutralize spreadsheet formula injection: a leading =, +, -, @ makes Excel
  // evaluate the cell. Prefix with a tab so it stays inert text.
  const safe = /^[=+\-@]/.test(value) ? `\t${value}` : value;
  if (/[",\n]/.test(safe)) return `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function sendPatch(patch: Partial<ScanOptions>): void {
  void send({ type: 'setOptions', patch });
}

async function send(payload: BgInbound): Promise<void> {
  if (tabId == null) return;
  await chrome.runtime.sendMessage<PopupQuery>({ type: 'popupQuery', tabId, payload });
  await refresh();
}

async function query(msg: PopupQuery): Promise<BgTabStateResponse | null> {
  try {
    const r = await chrome.runtime.sendMessage<PopupQuery, BgTabStateResponse>(msg);
    return r ?? null;
  } catch {
    return null;
  }
}

function setUnsupported(text: string): void {
  detection.classList.add('status--no');
  if (detectionText) detectionText.textContent = text;
  enabledInput.disabled = true;
}
