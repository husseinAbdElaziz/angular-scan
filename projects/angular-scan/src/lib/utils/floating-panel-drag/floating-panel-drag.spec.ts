import { describe, expect, it, vi } from 'vitest';
import { FloatingPanelDrag } from './floating-panel-drag';

describe('FloatingPanelDrag', () => {
  it('updates position on pointer drag', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'getBoundingClientRect', {
      value: () => ({ left: 100, top: 200, width: 120, height: 40 }),
    });
    document.body.appendChild(host);

    const setPosition = vi.fn();
    const drag = new FloatingPanelDrag({
      host,
      getPosition: () => null,
      setPosition,
    });

    drag.onPointerDown(new PointerEvent('pointerdown', { button: 0, clientX: 110, clientY: 210, pointerId: 1 }));
    document.dispatchEvent(new PointerEvent('pointermove', { clientX: 130, clientY: 230, pointerId: 1 }));

    expect(setPosition).toHaveBeenCalledWith({ left: 100, top: 200 });
    expect(setPosition).toHaveBeenLastCalledWith({ left: 120, top: 220 });

    drag.destroy();
    document.body.removeChild(host);
  });

  it('ignores non-primary pointer buttons', () => {
    const host = document.createElement('div');
    const setPosition = vi.fn();
    const drag = new FloatingPanelDrag({ host, getPosition: () => null, setPosition });

    drag.onPointerDown(new PointerEvent('pointerdown', { button: 1, pointerId: 2 }));

    expect(setPosition).not.toHaveBeenCalled();
    drag.destroy();
  });
});
