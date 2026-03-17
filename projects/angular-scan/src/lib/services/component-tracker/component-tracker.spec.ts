import { TestBed } from '@angular/core/testing';
import { ComponentTracker } from './component-tracker';
import { RENDER_KINDS } from './component-tracker.fixtures';

describe('ComponentTracker', () => {
  let tracker: ComponentTracker;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    tracker = TestBed.inject(ComponentTracker);
  });

  it('initializes with zero counts and empty list', () => {
    expect(tracker.totalRenders()).toBe(0);
    expect(tracker.totalUnnecessary()).toBe(0);
    expect(tracker.trackedComponents()).toEqual([]);
  });

  describe('recordRender', () => {
    it.each(RENDER_KINDS)('records a %s render and increments totalRenders', (kind: typeof RENDER_KINDS[number]) => {
      const stats = tracker.recordRender({}, document.createElement('div'), kind);
      expect(stats.totalRenders).toBe(1);
      expect(stats.lastRenderKind).toBe(kind);
      expect(tracker.totalRenders()).toBe(1);
    });

    it('increments totalUnnecessary only for unnecessary renders', () => {
      tracker.recordRender({}, document.createElement('div'), 'render');
      expect(tracker.totalUnnecessary()).toBe(0);
      tracker.recordRender({}, document.createElement('span'), 'unnecessary');
      expect(tracker.totalUnnecessary()).toBe(1);
    });

    it('accumulates stats for the same instance', () => {
      const instance = {};
      const el = document.createElement('div');
      tracker.recordRender(instance, el, 'render');
      tracker.recordRender(instance, el, 'unnecessary');
      const stats = tracker.recordRender(instance, el, 'render');
      expect(stats.totalRenders).toBe(3);
      expect(stats.unnecessaryRenders).toBe(1);
    });

    it('uses the constructor name as componentName', () => {
      class MyWidget {}
      const stats = tracker.recordRender(new MyWidget(), document.createElement('div'), 'render');
      expect(stats.componentName).toBe('MyWidget');
    });

    it('sets lastRenderTimestamp to a positive number', () => {
      const stats = tracker.recordRender({}, document.createElement('div'), 'render');
      expect(stats.lastRenderTimestamp).toBeGreaterThan(0);
    });
  });

  describe('snapshotTrackedComponents', () => {
    it('populates trackedComponents from recorded renders', () => {
      tracker.recordRender({}, document.createElement('div'), 'render');
      tracker.snapshotTrackedComponents();
      expect(tracker.trackedComponents()).toHaveLength(1);
    });

    it('reflects the latest stats in the snapshot', () => {
      const instance = {};
      const el = document.createElement('div');
      tracker.recordRender(instance, el, 'render');
      tracker.recordRender(instance, el, 'unnecessary');
      tracker.snapshotTrackedComponents();
      const [comp] = tracker.trackedComponents();
      expect(comp.totalRenders).toBe(2);
      expect(comp.unnecessaryRenders).toBe(1);
    });

    it('includes one entry per unique host element', () => {
      tracker.recordRender({}, document.createElement('div'), 'render');
      tracker.recordRender({}, document.createElement('span'), 'render');
      tracker.snapshotTrackedComponents();
      expect(tracker.trackedComponents()).toHaveLength(2);
    });
  });

  describe('reset', () => {
    it('clears all signals and the component list', () => {
      tracker.recordRender({}, document.createElement('div'), 'render');
      tracker.snapshotTrackedComponents();
      tracker.reset();
      expect(tracker.totalRenders()).toBe(0);
      expect(tracker.totalUnnecessary()).toBe(0);
      expect(tracker.trackedComponents()).toEqual([]);
    });
  });
});
