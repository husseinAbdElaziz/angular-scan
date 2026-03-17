import type { BrowserWindow } from '../models/BrowserWindow';
import { createCanvasOverlay } from './canvas-overlay';

function makeMockWin(): BrowserWindow {
  return {
    innerWidth: 800,
    innerHeight: 600,
    performance: { now: () => 0 },
    requestAnimationFrame: vi.fn().mockReturnValue(1),
    cancelAnimationFrame: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getComputedStyle: vi.fn().mockReturnValue({ position: 'static' }),
  } as unknown as BrowserWindow;
}

describe('createCanvasOverlay', () => {
  describe('initialization', () => {
    it('appends a canvas element to document.body', () => {
      const win = makeMockWin();
      createCanvasOverlay(document, win);
      const canvas = document.body.querySelector('canvas');
      expect(canvas).not.toBeNull();
      canvas?.remove();
    });

    it('sets aria-hidden="true" and role="presentation" on the canvas', () => {
      const win = makeMockWin();
      createCanvasOverlay(document, win);
      const canvas = document.body.querySelector('canvas')!;
      expect(canvas.getAttribute('aria-hidden')).toBe('true');
      expect(canvas.getAttribute('role')).toBe('presentation');
      canvas.remove();
    });

    it('starts the animation loop via requestAnimationFrame', () => {
      const win = makeMockWin();
      createCanvasOverlay(document, win);
      expect(win.requestAnimationFrame).toHaveBeenCalled();
      document.body.querySelector('canvas')?.remove();
    });

    it('attaches a resize listener', () => {
      const win = makeMockWin();
      createCanvasOverlay(document, win);
      expect(win.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
      document.body.querySelector('canvas')?.remove();
    });
  });

  describe('flash', () => {
    it('is a no-op for zero-size elements (does not throw)', () => {
      const win = makeMockWin();
      const overlay = createCanvasOverlay(document, win);
      const el = document.createElement('div');
      // getBoundingClientRect returns all-zeros by default in jsdom
      expect(() => overlay.flash(el, 'render', 500)).not.toThrow();
      document.body.querySelector('canvas')?.remove();
    });
  });

  describe('detach', () => {
    it('removes the canvas from the DOM', () => {
      const win = makeMockWin();
      const overlay = createCanvasOverlay(document, win);
      expect(document.body.querySelector('canvas')).not.toBeNull();
      overlay.detach();
      expect(document.body.querySelector('canvas')).toBeNull();
    });

    it('cancels the animation frame', () => {
      const win = makeMockWin();
      const overlay = createCanvasOverlay(document, win);
      overlay.detach();
      expect(win.cancelAnimationFrame).toHaveBeenCalled();
    });

    it('removes the resize listener', () => {
      const win = makeMockWin();
      const overlay = createCanvasOverlay(document, win);
      overlay.detach();
      expect(win.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });
});
