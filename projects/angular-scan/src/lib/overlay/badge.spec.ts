import { BADGE_COLORS, clearBadges, createOrUpdateBadge, ensurePositioned } from './badge';
import type { RenderKind } from '../models/RenderKind';

describe('badge', () => {
  describe('createOrUpdateBadge', () => {
    it.each([
      { kind: 'render' as RenderKind },
      { kind: 'unnecessary' as RenderKind },
    ])('creates a badge div inside the host for $kind', ({ kind }) => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      createOrUpdateBadge(new Map(), el, 1, kind);

      expect(el.querySelector('div')).not.toBeNull();
      el.remove();
    });

    it('sets aria-hidden="true" and role="presentation"', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      createOrUpdateBadge(new Map(), el, 1, 'render');

      const badge = el.querySelector('div')!;
      expect(badge.getAttribute('aria-hidden')).toBe('true');
      expect(badge.getAttribute('role')).toBe('presentation');
      el.remove();
    });

    it.each([
      { kind: 'render' as RenderKind, expected: BADGE_COLORS.render },
      { kind: 'unnecessary' as RenderKind, expected: BADGE_COLORS.unnecessary },
    ])('sets correct background for $kind', ({ kind, expected }) => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      createOrUpdateBadge(new Map(), el, 1, kind);

      const bg = (el.querySelector('div') as HTMLElement).style.background;
      // jsdom normalises hex → rgb(); accept either form
      expect(bg.replace(/\s/g, '')).toMatch(
        new RegExp(`${expected}|rgb\\(`, 'i'),
      );
      el.remove();
    });

    it('shows the count as text content', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      createOrUpdateBadge(new Map(), el, 42, 'render');

      expect((el.querySelector('div') as HTMLElement).textContent).toBe('42');
      el.remove();
    });

    it('reuses the same badge element on subsequent calls', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const badges = new Map<Element, HTMLElement>();

      createOrUpdateBadge(badges, el, 1, 'render');
      createOrUpdateBadge(badges, el, 2, 'render');

      expect(el.querySelectorAll('div')).toHaveLength(1);
      expect((el.querySelector('div') as HTMLElement).textContent).toBe('2');
      el.remove();
    });

    it('registers the badge in the provided map', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const badges = new Map<Element, HTMLElement>();

      createOrUpdateBadge(badges, el, 1, 'render');

      expect(badges.has(el)).toBe(true);
      el.remove();
    });

    it('returns the badge HTMLElement', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      const badge = createOrUpdateBadge(new Map(), el, 1, 'render');

      expect(badge).toBeInstanceOf(HTMLElement);
      el.remove();
    });
  });

  describe('clearBadges', () => {
    it('removes all badge elements from the DOM', () => {
      const el1 = document.createElement('div');
      const el2 = document.createElement('span');
      document.body.append(el1, el2);
      const badges = new Map<Element, HTMLElement>();

      createOrUpdateBadge(badges, el1, 1, 'render');
      createOrUpdateBadge(badges, el2, 1, 'unnecessary');
      clearBadges(badges);

      expect(el1.querySelector('div')).toBeNull();
      expect(el2.querySelector('div')).toBeNull();
      el1.remove();
      el2.remove();
    });

    it('clears the badges map', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);
      const badges = new Map<Element, HTMLElement>();

      createOrUpdateBadge(badges, el, 1, 'render');
      clearBadges(badges);

      expect(badges.size).toBe(0);
      el.remove();
    });
  });

  describe('ensurePositioned', () => {
    it('sets position:relative when the element is statically positioned', () => {
      const el = document.createElement('div');
      document.body.appendChild(el);

      ensurePositioned(el);

      expect((el as HTMLElement).style.position).toBe('relative');
      el.remove();
    });

  });
});
