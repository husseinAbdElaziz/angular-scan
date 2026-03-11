import type { RenderKind } from './RenderKind';

export interface PendingUpdate {
  instance: object;
  hostElement: Element;
  kind: RenderKind;
}
