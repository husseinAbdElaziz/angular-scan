import { DEFAULT_OPTIONS, type ScanOptions, STORAGE_KEYS } from './settings';

export async function getOriginOptions(host: string): Promise<ScanOptions> {
  const key = STORAGE_KEYS.origin(host);
  const result = await chrome.storage.sync.get([key, STORAGE_KEYS.defaults]);
  const overrides = (result[key] ?? result[STORAGE_KEYS.defaults] ?? {}) as Partial<ScanOptions>;
  return { ...DEFAULT_OPTIONS, ...overrides };
}

export async function setOriginOptions(host: string, options: Partial<ScanOptions>): Promise<ScanOptions> {
  const current = await getOriginOptions(host);
  const next: ScanOptions = { ...current, ...options };
  await chrome.storage.sync.set({ [STORAGE_KEYS.origin(host)]: next });
  return next;
}

export function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}
