import type { NgDebugApi } from '../../models/NgDebugApi';

/** Walk mutated nodes UP the DOM to find their owning Angular component host. */
export function buildMutatedHosts(
  nodes: Set<Node>,
  body: Element,
  ng: NgDebugApi,
): Set<Element> {
  const hosts = new Set<Element>();

  for (const node of nodes) {
    let current: Node | null = node;

    while (current && current !== body) {
      if (current instanceof Element) {
        try {
          if (ng.getComponent(current)) {
            hosts.add(current);
            break;
          }
        } catch { /* ignore destroyed nodes */ }
      }
      current = current.parentNode;
    }
  }

  return hosts;
}
