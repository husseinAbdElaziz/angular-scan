import { buildMutatedHosts } from './build-mutated-hosts';
import { makeNgDebugApi } from '../ng-debug/ng-debug.fixtures';

describe('buildMutatedHosts', () => {
  let body: Element;

  beforeEach(() => { body = document.createElement('body'); });

  it('returns an empty set when no nodes are provided', () => {
    expect(buildMutatedHosts(new Set(), body, makeNgDebugApi())).toHaveProperty('size', 0);
  });

  it('adds an element that is a direct component host', () => {
    const el = document.createElement('div');
    const ng = makeNgDebugApi({ getComponent: (e) => (e === el ? {} : null) });
    expect(buildMutatedHosts(new Set([el]), body, ng).has(el)).toBe(true);
  });

  it('walks up the DOM to find the owning component host', () => {
    const host = document.createElement('div');
    const child = document.createElement('span');
    host.appendChild(child);
    body.appendChild(host);
    const ng = makeNgDebugApi({ getComponent: (e) => (e === host ? {} : null) });
    const result = buildMutatedHosts(new Set([child]), body, ng);
    expect(result.has(host)).toBe(true);
    expect(result.has(child)).toBe(false);
  });

  it('stops walking at body and does not add it', () => {
    const el = document.createElement('div');
    body.appendChild(el);
    expect(buildMutatedHosts(new Set([el]), body, makeNgDebugApi())).toHaveProperty('size', 0);
  });

  it('ignores non-Element nodes (e.g. text nodes)', () => {
    const text = document.createTextNode('hello');
    expect(buildMutatedHosts(new Set([text]), body, makeNgDebugApi())).toHaveProperty('size', 0);
  });

  it('does not throw when getComponent throws (destroyed node)', () => {
    const el = document.createElement('div');
    body.appendChild(el);
    const ng = makeNgDebugApi({ getComponent: () => { throw new Error('destroyed'); } });
    expect(() => buildMutatedHosts(new Set([el]), body, ng)).not.toThrow();
  });

  it('deduplicates multiple children with the same host', () => {
    const host = document.createElement('div');
    const child1 = document.createElement('span');
    const child2 = document.createElement('p');
    host.appendChild(child1);
    host.appendChild(child2);
    body.appendChild(host);
    const ng = makeNgDebugApi({ getComponent: (e) => (e === host ? {} : null) });
    const result = buildMutatedHosts(new Set([child1, child2]), body, ng);
    expect(result.size).toBe(1);
    expect(result.has(host)).toBe(true);
  });
});
