import { copyText } from '@shared/clipboard';
import type { ComponentReport, ScanTabInfo, ScanTabsResponse } from '@shared/messages';
import { type LoadedReport, parseReportFile, summarize } from './parse';

type SortKey = 'name' | 'renders' | 'wasted' | 'rps5s' | 'rpsPeak' | 'source';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const sourceLabel = $('source-label');
const modeLive = $<HTMLInputElement>('mode-live');
const modeFile = $<HTMLInputElement>('mode-file');
const panelLive = $('panel-live');
const panelFile = $('panel-file');
const tabSelect = $<HTMLSelectElement>('tab-select');
const refreshBtn = $<HTMLButtonElement>('refresh');
const autoInput = $<HTMLInputElement>('auto');
const dropzone = $('dropzone');
const fileInput = $<HTMLInputElement>('file-input');
const cards = $('cards');
const barsSection = $('bars-section');
const barsEl = $('bars');
const tableSection = $('table-section');
const reportBody = $<HTMLTableSectionElement>('report-body');
const searchInput = $<HTMLInputElement>('search');
const onlyWasted = $<HTMLInputElement>('only-wasted');
const rowCount = $('row-count');
const emptyEl = $('empty');

const BAR_TOP_N = 15;

let current: LoadedReport | null = null;
let sortKey: SortKey = 'renders';
let sortDesc = true;
let autoTimer: number | null = null;
let toastEl: HTMLElement | null = null;
let toastTimer: number | null = null;

void boot();

async function boot(): Promise<void> {
  wireSourceModes();
  wireUpload();
  wireTableControls();
  await loadTabs();
}

// --- source modes -----------------------------------------------------------
function wireSourceModes(): void {
  const apply = () => {
    const live = modeLive.checked;
    panelLive.hidden = !live;
    panelFile.hidden = live;
    stopAuto();
    if (live) void loadFromTab();
  };
  modeLive.addEventListener('change', apply);
  modeFile.addEventListener('change', apply);
  refreshBtn.addEventListener('click', () => void loadFromTab());
  tabSelect.addEventListener('change', () => void loadFromTab());
  autoInput.addEventListener('change', () => (autoInput.checked ? startAuto() : stopAuto()));
}

async function loadTabs(): Promise<void> {
  const res = await sendMessage<ScanTabsResponse>({ type: 'listScanTabs' });
  const tabs = res?.tabs ?? [];
  tabSelect.innerHTML = '';
  if (tabs.length === 0) {
    const opt = document.createElement('option');
    opt.textContent = 'No active Angular Scan tabs';
    opt.value = '';
    tabSelect.appendChild(opt);
    tabSelect.disabled = true;
    refreshBtn.disabled = true;
    autoInput.disabled = true;
    return;
  }
  tabSelect.disabled = false;
  refreshBtn.disabled = false;
  autoInput.disabled = false;
  for (const t of tabs) {
    const opt = document.createElement('option');
    opt.value = String(t.tabId);
    opt.textContent = tabLabel(t);
    tabSelect.appendChild(opt);
  }
  if (modeLive.checked) void loadFromTab();
}

function tabLabel(t: ScanTabInfo): string {
  const host = t.host ?? (t.url ? safeHost(t.url) : '');
  const title = t.title || host || `Tab ${t.tabId}`;
  return host && !title.includes(host) ? `${title} — ${host}` : title;
}

async function loadFromTab(): Promise<void> {
  const tabId = Number(tabSelect.value);
  if (!Number.isFinite(tabId) || tabId <= 0) return;
  const res = await sendMessage<{ ok: boolean; report?: ComponentReport[] }>({
    type: 'popupQuery',
    tabId,
    payload: { type: 'getReport' },
  });
  if (!res?.ok) {
    showToast('Could not read that tab');
    return;
  }
  const label = tabSelect.options[tabSelect.selectedIndex]?.text ?? `Tab ${tabId}`;
  current = { origin: 'live', label, rows: res.report ?? [] };
  render();
}

function startAuto(): void {
  stopAuto();
  autoTimer = window.setInterval(() => void loadFromTab(), 1500);
}
function stopAuto(): void {
  if (autoTimer != null) {
    clearInterval(autoTimer);
    autoTimer = null;
  }
}
window.addEventListener('unload', stopAuto);

// --- upload ------------------------------------------------------------------
function wireUpload(): void {
  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) void loadFile(file);
  });
  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const file = e.dataTransfer?.files?.[0];
    if (file) void loadFile(file);
  });
}

async function loadFile(file: File): Promise<void> {
  try {
    const text = await file.text();
    current = parseReportFile(file.name, text);
    render();
  } catch (err) {
    showToast(`Failed to read file: ${err instanceof Error ? err.message : 'unknown error'}`);
  }
}

// --- rendering ---------------------------------------------------------------
function render(): void {
  if (!current) return;
  const at = current.generatedAt ? ` · ${new Date(current.generatedAt).toLocaleString()}` : '';
  sourceLabel.textContent = `${current.origin === 'live' ? 'Live' : 'File'}: ${current.label}${at}`;

  const has = current.rows.length > 0;
  cards.hidden = !has;
  barsSection.hidden = !has;
  tableSection.hidden = !has;
  emptyEl.hidden = has;
  if (!has) {
    emptyEl.textContent = 'This report has no components.';
    return;
  }

  renderCards();
  renderBars();
  renderTable();
}

function renderCards(): void {
  const s = summarize(current!.rows);
  $('c-components').textContent = String(s.components);
  $('c-renders').textContent = String(s.totalRenders);
  $('c-wasted').textContent = String(s.totalWasted);
  $('c-wasted-pct').textContent = `${s.wastedPct}%`;
  $('c-peak').textContent = s.peakRate.toFixed(2);
  $('c-source-pct').textContent = `${s.withSourcePct}%`;
}

function renderBars(): void {
  const top = [...current!.rows].sort((a, b) => b.renders - a.renders).slice(0, BAR_TOP_N);
  const max = top.reduce((m, r) => Math.max(m, r.renders), 0) || 1;
  barsEl.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const r of top) {
    const good = Math.max(0, r.renders - r.wasted);
    const row = document.createElement('div');
    row.className = 'bar-row';

    const name = document.createElement('span');
    name.className = 'bar-row__name';
    name.textContent = r.name;
    name.title = r.name;

    const bar = document.createElement('div');
    bar.className = 'bar';
    const green = document.createElement('span');
    green.className = 'bar__render';
    green.style.width = `${(good / max) * 100}%`;
    const red = document.createElement('span');
    red.className = 'bar__wasted';
    red.style.width = `${(r.wasted / max) * 100}%`;
    red.style.left = `${(good / max) * 100}%`;
    bar.append(green, red);

    const val = document.createElement('span');
    val.className = 'bar-row__val';
    val.textContent = `${r.renders} / ${r.wasted}`;

    row.append(name, bar, val);
    frag.appendChild(row);
  }
  barsEl.appendChild(frag);
}

function visibleRows(): ComponentReport[] {
  const q = searchInput.value.trim().toLowerCase();
  let rows = current!.rows;
  if (q) rows = rows.filter((r) => r.name.toLowerCase().includes(q));
  if (onlyWasted.checked) rows = rows.filter((r) => r.wasted > 0);
  return sortRows(rows, sortKey, sortDesc);
}

function renderTable(): void {
  const rows = visibleRows();
  document.querySelectorAll<HTMLElement>('.report thead th').forEach((th) => {
    const active = th.dataset.sort === sortKey;
    th.classList.toggle('sorted', active);
    th.classList.toggle('asc', active && !sortDesc);
  });
  rowCount.textContent = `${rows.length} of ${current!.rows.length}`;
  reportBody.innerHTML = '';
  const frag = document.createDocumentFragment();
  for (const r of rows) {
    const tr = document.createElement('tr');
    if (r.wasted > 0 && r.wasted > r.renders - r.wasted) tr.classList.add('wasted-heavy');
    appendNameCell(tr, r);
    appendCell(tr, String(r.renders), 'num');
    appendCell(tr, String(r.wasted), 'num wasted');
    appendCell(tr, r.rps5s.toFixed(2), 'num');
    appendCell(tr, r.rpsPeak.toFixed(2), 'num');
    appendCell(tr, formatSource(r), 'source', formatSourceTitle(r));
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
  btn.title = hasSource ? `Copy ${formatSourceTitle(row)}` : `Copy "${row.name}" — no source`;
  btn.addEventListener('click', () => void copySource(row));
  td.appendChild(btn);
  tr.appendChild(td);
}

async function copySource(row: ComponentReport): Promise<void> {
  const loc = row.sourceLocation;
  const text = loc?.file ? (loc.line != null ? `${loc.file}:${loc.line}` : loc.file) : row.name;
  const ok = await copyText(text);
  if (!ok) showToast('Copy failed');
  else showToast(loc?.file ? `Copied ${text}` : `Copied "${row.name}" — no source`);
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

function sortRows(rows: ComponentReport[], key: SortKey, desc: boolean): ComponentReport[] {
  const dir = desc ? -1 : 1;
  return [...rows].sort((a, b) => {
    if (key === 'source') return (a.sourceLocation?.file ?? '').localeCompare(b.sourceLocation?.file ?? '') * dir;
    if (key === 'name') return a.name.localeCompare(b.name) * dir;
    return ((a[key] as number) - (b[key] as number)) * dir;
  });
}

function wireTableControls(): void {
  document.querySelectorAll<HTMLElement>('.report thead th').forEach((th) => {
    th.addEventListener('click', () => {
      const key = th.dataset.sort as SortKey | undefined;
      if (!key) return;
      if (sortKey === key) sortDesc = !sortDesc;
      else {
        sortKey = key;
        sortDesc = key !== 'name' && key !== 'source';
      }
      if (current) renderTable();
    });
  });
  searchInput.addEventListener('input', () => current && renderTable());
  onlyWasted.addEventListener('change', () => current && renderTable());
}

// --- utils -------------------------------------------------------------------
function safeHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
}

async function sendMessage<T>(msg: unknown): Promise<T | null> {
  try {
    return (await chrome.runtime.sendMessage(msg)) as T;
  } catch {
    return null;
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
