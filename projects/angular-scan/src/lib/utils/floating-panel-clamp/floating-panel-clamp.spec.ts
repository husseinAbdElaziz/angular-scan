import { describe, expect, it, vi, afterEach } from 'vitest';
import { clampFloatingPanelToViewport } from './floating-panel-clamp';

describe('clampFloatingPanelToViewport', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps position when the panel already fits', () => {
    vi.stubGlobal('innerWidth', 1000);
    vi.stubGlobal('innerHeight', 800);

    expect(
      clampFloatingPanelToViewport(
        { left: 700, top: 600, width: 200, height: 120 },
        { left: 700, top: 600 },
        16,
      ),
    ).toEqual({ left: 700, top: 600 });
  });

  it('moves the panel up when expansion would overflow the bottom edge', () => {
    vi.stubGlobal('innerWidth', 1000);
    vi.stubGlobal('innerHeight', 800);

    expect(
      clampFloatingPanelToViewport(
        { left: 700, top: 700, width: 200, height: 200 },
        { left: 700, top: 700 },
        16,
      ),
    ).toEqual({ left: 700, top: 584 });
  });

  it('clamps to the top padding when the panel is taller than the viewport', () => {
    vi.stubGlobal('innerWidth', 400);
    vi.stubGlobal('innerHeight', 300);

    expect(
      clampFloatingPanelToViewport(
        { left: 50, top: 200, width: 200, height: 400 },
        { left: 50, top: 200 },
        16,
      ),
    ).toEqual({ left: 50, top: 16 });
  });
});
