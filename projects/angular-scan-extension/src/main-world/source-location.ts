import type { SourceLocation } from '@shared/messages';

// Set by the Angular compiler via `ɵsetClassDebugInfo` and stored on the
// component/directive definition. `filePath`/`lineNumber` are emitted in dev
// builds (when source maps are on) and are the canonical source location —
// the same data DevTools uses. Relative to the project root, e.g.
// `src/app/foo.component.ts`.
interface ClassDebugInfo {
  className?: string;
  filePath?: string;
  lineNumber?: number;
}

interface DirectiveDef {
  debugInfo?: ClassDebugInfo | null;
}

type DefHolder = Function & { ɵcmp?: DirectiveDef; ɵdir?: DirectiveDef };

// Legacy/fallback shape from `getDirectiveMetadata`.
interface NgDirectiveMetadata {
  framework?: { location?: { file?: string; line?: number; column?: number } };
  location?: { file?: string; line?: number; column?: number };
}

interface NgWithMetadata {
  getDirectiveMetadata?: (instance: object) => unknown;
}

const cache = new WeakMap<Function, SourceLocation | null>();

export function resolveSourceLocation(instance: object, ng: NgWithMetadata): SourceLocation | null {
  const ctor = instance.constructor as DefHolder | undefined;
  if (!ctor) return null;
  const cached = cache.get(ctor);
  if (cached !== undefined) return cached;

  let result = fromDebugInfo(ctor) ?? fromDirectiveMetadata(instance, ng);

  cache.set(ctor, result);
  return result;
}

function fromDebugInfo(ctor: DefHolder): SourceLocation | null {
  const debugInfo = ctor.ɵcmp?.debugInfo ?? ctor.ɵdir?.debugInfo;
  if (!debugInfo?.filePath) return null;
  return {
    file: String(debugInfo.filePath),
    ...(typeof debugInfo.lineNumber === 'number' ? { line: debugInfo.lineNumber } : {}),
  };
}

function fromDirectiveMetadata(instance: object, ng: NgWithMetadata): SourceLocation | null {
  try {
    const meta = ng.getDirectiveMetadata?.(instance) as NgDirectiveMetadata | null | undefined;
    const loc = meta?.framework?.location ?? meta?.location;
    if (loc?.file) {
      return {
        file: String(loc.file),
        ...(typeof loc.line === 'number' ? { line: loc.line } : {}),
        ...(typeof loc.column === 'number' ? { column: loc.column } : {}),
      };
    }
  } catch {
    // ignore
  }
  return null;
}
