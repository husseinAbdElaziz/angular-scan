import type { SourceLocation } from '@shared/messages';

const TIMESTAMP_CAP = 200;

export interface ComponentEntry {
  id: string;
  name: string;
  host: Element;
  renders: number;
  wasted: number;
  lastFlashKind: 'render' | 'wasted' | null;
  timestamps: number[];
  sourceLocation: SourceLocation | null;
}

export class Tracker {
  private readonly byInstance = new WeakMap<object, ComponentEntry>();
  private readonly entries = new Set<ComponentEntry>();
  private readonly byId = new Map<string, ComponentEntry>();
  private nextId = 1;

  ensure(instance: object, host: Element, name: string, sourceLocation: SourceLocation | null): ComponentEntry {
    let entry = this.byInstance.get(instance);
    if (entry) return entry;
    const id = `c${this.nextId++}`;
    entry = {
      id,
      name,
      host,
      renders: 0,
      wasted: 0,
      lastFlashKind: null,
      timestamps: [],
      sourceLocation,
    };
    this.byInstance.set(instance, entry);
    this.entries.add(entry);
    this.byId.set(id, entry);
    return entry;
  }

  recordRender(entry: ComponentEntry, at: number): void {
    entry.timestamps.push(at);
    if (entry.timestamps.length > TIMESTAMP_CAP) {
      entry.timestamps.splice(0, entry.timestamps.length - TIMESTAMP_CAP);
    }
  }

  byIdLookup(id: string): ComponentEntry | undefined {
    return this.byId.get(id);
  }

  prune(): void {
    for (const entry of this.entries) {
      if (!entry.host.isConnected) {
        this.entries.delete(entry);
        this.byId.delete(entry.id);
      }
    }
  }

  list(): ComponentEntry[] {
    this.prune();
    return [...this.entries];
  }

  reset(): void {
    for (const entry of this.entries) {
      entry.renders = 0;
      entry.wasted = 0;
      entry.lastFlashKind = null;
      entry.timestamps = [];
    }
  }
}
