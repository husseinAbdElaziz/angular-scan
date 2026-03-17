import type { BrowserWindow } from './models/BrowserWindow';
import { scan } from './scan';

type WindowWithNg = BrowserWindow & { ng?: unknown };

describe('scan', () => {
  let originalNg: unknown;

  beforeEach(() => {
    originalNg = (window as WindowWithNg).ng;
  });

  afterEach(() => {
    if (originalNg === undefined) {
      delete (window as WindowWithNg).ng;
    } else {
      (window as WindowWithNg).ng = originalNg;
    }
  });

  it.each([
    {
      label: 'enabled is false',
      options: { enabled: false } as const,
    },
  ])('returns a no-op teardown when $label', ({ options }) => {
    const teardown = scan(options);
    expect(typeof teardown).toBe('function');
    expect(() => teardown()).not.toThrow();
  });

  it('warns and returns a no-op when window.ng is absent', () => {
    delete (window as WindowWithNg).ng;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const teardown = scan();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[angular-scan]'));
    expect(() => teardown()).not.toThrow();
    warn.mockRestore();
  });

  it('does not warn when enabled is false', () => {
    delete (window as WindowWithNg).ng;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    scan({ enabled: false });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  describe('when window.ng is available', () => {
    let teardown: () => void;

    beforeEach(() => {
      (window as WindowWithNg).ng = {
        ɵsetProfiler: vi.fn().mockReturnValue(vi.fn()),
        getHostElement: vi.fn().mockReturnValue(null),
        getComponent: vi.fn().mockReturnValue(null),
        getRootComponents: vi.fn().mockReturnValue([]),
        getOwningComponent: vi.fn().mockReturnValue(null),
        getDirectives: vi.fn().mockReturnValue([]),
      };
    });

    afterEach(() => teardown?.());

    it('returns a callable teardown function', () => {
      teardown = scan();
      expect(typeof teardown).toBe('function');
      expect(() => teardown()).not.toThrow();
    });

    it('appends a canvas overlay to the body', () => {
      teardown = scan();
      expect(document.body.querySelector('canvas')).not.toBeNull();
    });

    it('teardown removes the canvas from the body', () => {
      teardown = scan();
      expect(document.body.querySelector('canvas')).not.toBeNull();
      teardown();
      expect(document.body.querySelector('canvas')).toBeNull();
    });
  });
});
