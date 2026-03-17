import { collectTickUpdates } from './collect-tick-updates';
import { makeNgDebugApi } from '../ng-debug/ng-debug.fixtures';

describe('collectTickUpdates', () => {
  it('returns an empty array when instances set is empty', () => {
    expect(collectTickUpdates(new Set(), new Set(), makeNgDebugApi())).toEqual([]);
  });

  it.each([
    { inMutated: true, expectedKind: 'render' as const },
    { inMutated: false, expectedKind: 'unnecessary' as const },
  ])('classifies as "$expectedKind" when host is $inMutated in mutatedHosts', ({ inMutated, expectedKind }: { inMutated: boolean; expectedKind: 'render' | 'unnecessary' }) => {
    const instance = {};
    const el = document.createElement('div');
    const ng = makeNgDebugApi({ getHostElement: () => el });
    const mutated = inMutated ? new Set([el]) : new Set<Element>();
    const [update] = collectTickUpdates(new Set([instance]), mutated, ng);
    expect(update.kind).toBe(expectedKind);
  });

  it('skips instances where getHostElement returns null', () => {
    const ng = makeNgDebugApi({ getHostElement: () => null });
    expect(collectTickUpdates(new Set([{}]), new Set(), ng)).toHaveLength(0);
  });

  it('does not throw and skips when getHostElement throws (destroyed)', () => {
    const ng = makeNgDebugApi({ getHostElement: () => { throw new Error('destroyed'); } });
    expect(() => collectTickUpdates(new Set([{}]), new Set(), ng)).not.toThrow();
    expect(collectTickUpdates(new Set([{}]), new Set(), ng)).toHaveLength(0);
  });

  it('processes multiple instances and assigns correct kinds', () => {
    const a = {}, b = {};
    const elA = document.createElement('div');
    const elB = document.createElement('span');
    const ng = makeNgDebugApi({ getHostElement: (i) => i === a ? elA : elB });
    const result = collectTickUpdates(new Set([a, b]), new Set([elA]), ng);
    const kindMap = new Map(result.map((u) => [u.hostElement, u.kind]));
    expect(kindMap.get(elA)).toBe('render');
    expect(kindMap.get(elB)).toBe('unnecessary');
  });
});
