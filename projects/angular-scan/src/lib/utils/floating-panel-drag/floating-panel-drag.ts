import { clampFloatingPanelToViewport } from '../floating-panel-clamp/floating-panel-clamp';

export type PanelPosition = { left: number; top: number };

export interface FloatingPanelDragOptions {
  host: HTMLElement;
  getPosition: () => PanelPosition | null;
  setPosition: (position: PanelPosition) => void;
  viewportPaddingPx?: number;
}

const DRAG_END_EVENTS = ['pointerup', 'pointercancel'] as const;

export class FloatingPanelDrag {
  private readonly viewportPaddingPx: number;

  private dragActive: {
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null = null;

  private listenersAttached = false;

  private readonly onDragMove = (event: PointerEvent): void => {
    const drag = this.dragActive;
    if (!drag || event.pointerId !== drag.pointerId) {
      return;
    }

    this.options.setPosition(
      this.clampPosition(
        drag.originLeft + (event.clientX - drag.startX),
        drag.originTop + (event.clientY - drag.startY),
      ),
    );
  };

  private readonly onDragEnd = (event: PointerEvent): void => {
    if (!this.dragActive || event.pointerId !== this.dragActive.pointerId) {
      return;
    }

    this.dragActive = null;
    this.setDocumentListeners(false);
  };

  constructor(private readonly options: FloatingPanelDragOptions) {
    this.viewportPaddingPx = options.viewportPaddingPx ?? 8;
  }

  onPointerDown(event: PointerEvent): void {
    if (event.button !== 0) {
      return;
    }

    const rect = this.options.host.getBoundingClientRect();
    const origin = this.options.getPosition() ?? { left: rect.left, top: rect.top };
    this.options.setPosition(origin);

    this.dragActive = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originLeft: origin.left,
      originTop: origin.top,
    };

    this.setDocumentListeners(true);
    event.preventDefault();
  }

  destroy(): void {
    this.dragActive = null;
    this.setDocumentListeners(false);
  }

  private clampPosition(left: number, top: number): PanelPosition {
    const rect = this.options.host.getBoundingClientRect();
    return clampFloatingPanelToViewport(rect, { left, top }, this.viewportPaddingPx);
  }

  private setDocumentListeners(attached: boolean): void {
    if (attached === this.listenersAttached) {
      return;
    }
    this.listenersAttached = attached;
    if (attached) {
      document.addEventListener('pointermove', this.onDragMove);
      for (const type of DRAG_END_EVENTS) {
        document.addEventListener(type, this.onDragEnd);
      }
      return;
    }
    document.removeEventListener('pointermove', this.onDragMove);
    for (const type of DRAG_END_EVENTS) {
      document.removeEventListener(type, this.onDragEnd);
    }
  }

}
