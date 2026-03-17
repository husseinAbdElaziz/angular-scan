import type { BrowserWindow } from '../../models/BrowserWindow';
import { getNgDebugApi } from './ng-debug';
import { makeNgDebugApi } from './ng-debug.fixtures';

type WindowWithNg = BrowserWindow & { ng?: unknown };

describe('getNgDebugApi', () => {
  let originalNg: unknown;

  beforeEach(() => { originalNg = (window as WindowWithNg).ng; });
  afterEach(() => {
    if (originalNg === undefined) delete (window as WindowWithNg).ng;
    else (window as WindowWithNg).ng = originalNg;
  });

  it.each([
    { label: 'absent', value: undefined },
    { label: 'a string', value: 'not-an-object' },
    { label: 'null', value: null },
    { label: 'missing ɵsetProfiler', value: { getHostElement: (): null => null } },
    { label: 'missing getHostElement', value: { ɵsetProfiler: (): (() => void) => () => {} } },
    { label: 'ɵsetProfiler not a function', value: { ɵsetProfiler: 'x', getHostElement: (): null => null } },
  ] as Array<{ label: string; value: unknown }>)('returns null when window.ng is $label', ({ value }) => {
    if (value === undefined) delete (window as WindowWithNg).ng;
    else (window as WindowWithNg).ng = value;
    expect(getNgDebugApi()).toBeNull();
  });

  it('returns the api when both required functions are present', () => {
    const api = makeNgDebugApi();
    (window as WindowWithNg).ng = api;
    expect(getNgDebugApi()).toBe(api);
  });
});
