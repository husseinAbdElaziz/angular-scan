import { createTickProfiler } from './create-tick-profiler';
import { PROFILER_EVENTS as PE } from '../../models/ProfilerEvents';
import { makeNgDebugApi } from '../ng-debug/ng-debug.fixtures';
import type { NgDebugApi } from '../../models/NgDebugApi';
import type { PendingUpdate } from '../../models/PendingUpdate';

function makeNgWithProfiler(): {
  ng: NgDebugApi;
  fireEvent: (event: number, instance?: object | null) => void;
  removeProfiler: ReturnType<typeof vi.fn>;
} {
  let captured: ((event: number, instance: object | null) => void) | null = null;
  const removeProfiler = vi.fn();

  const ng = makeNgDebugApi({
    ɵsetProfiler: vi.fn((cb) => {
      captured = cb;
      return removeProfiler;
    }) as NgDebugApi['ɵsetProfiler'],
    getHostElement: vi.fn().mockReturnValue(document.createElement('div')),
    getComponent: vi.fn().mockReturnValue(null),
  });

  return {
    ng,
    fireEvent: (event, instance = null) => captured?.(event, instance),
    removeProfiler,
  };
}

describe('createTickProfiler', () => {
  let body: HTMLElement;

  beforeEach(() => {
    body = document.createElement('body');
  });

  it('registers a profiler via ng.ɵsetProfiler', () => {
    const { ng } = makeNgWithProfiler();
    createTickProfiler({ ng, body, onUpdates: vi.fn() });
    expect(ng.ɵsetProfiler).toHaveBeenCalledWith(expect.any(Function));
  });

  describe('teardown', () => {
    it('calls the removeProfiler fn returned by ɵsetProfiler', () => {
      const { ng, removeProfiler } = makeNgWithProfiler();
      const teardown = createTickProfiler({ ng, body, onUpdates: vi.fn() });
      teardown();
      expect(removeProfiler).toHaveBeenCalledOnce();
    });
  });

  describe('tick lifecycle', () => {
    it('calls onUpdates after a full tick cycle (Start → SyncStart → TemplateUpdate → SyncEnd → End)', () => {
      const { ng, fireEvent } = makeNgWithProfiler();
      const onUpdates = vi.fn();
      const instance = {};

      createTickProfiler({ ng, body, onUpdates });

      fireEvent(PE.ChangeDetectionStart);
      fireEvent(PE.ChangeDetectionSyncStart);
      fireEvent(PE.TemplateUpdateStart, instance);
      fireEvent(PE.ChangeDetectionSyncEnd);
      fireEvent(PE.ChangeDetectionEnd);

      expect(onUpdates).toHaveBeenCalledOnce();
    });

    it('does not call onUpdates if TemplateUpdateStart fires outside sync phase', () => {
      const { ng, fireEvent } = makeNgWithProfiler();
      const onUpdates = vi.fn();
      const instance = {};

      createTickProfiler({ ng, body, onUpdates });

      fireEvent(PE.ChangeDetectionStart);
      // no SyncStart — template update fires outside sync phase
      fireEvent(PE.TemplateUpdateStart, instance);
      fireEvent(PE.ChangeDetectionEnd);

      const [updates] = onUpdates.mock.calls[0] as [PendingUpdate[]];
      expect(updates).toHaveLength(0);
    });

    it('ignores nested ChangeDetectionStart when already in a tick', () => {
      const { ng, fireEvent } = makeNgWithProfiler();
      const onUpdates = vi.fn();

      createTickProfiler({ ng, body, onUpdates });

      fireEvent(PE.ChangeDetectionStart);
      fireEvent(PE.ChangeDetectionStart); // nested — should be ignored
      fireEvent(PE.ChangeDetectionEnd);

      expect(onUpdates).toHaveBeenCalledOnce();
    });

    it('does not call onUpdates for ChangeDetectionEnd outside a tick', () => {
      const { ng, fireEvent } = makeNgWithProfiler();
      const onUpdates = vi.fn();

      createTickProfiler({ ng, body, onUpdates });
      fireEvent(PE.ChangeDetectionEnd); // no prior Start

      expect(onUpdates).not.toHaveBeenCalled();
    });
  });

  describe('shouldTrack', () => {
    it('excludes instances where shouldTrack returns false', () => {
      const { ng, fireEvent } = makeNgWithProfiler();
      const onUpdates = vi.fn();
      const instance = {};

      createTickProfiler({ ng, body, shouldTrack: () => false, onUpdates });

      fireEvent(PE.ChangeDetectionStart);
      fireEvent(PE.ChangeDetectionSyncStart);
      fireEvent(PE.TemplateUpdateStart, instance);
      fireEvent(PE.ChangeDetectionSyncEnd);
      fireEvent(PE.ChangeDetectionEnd);

      const [updates] = onUpdates.mock.calls[0] as [PendingUpdate[]];
      expect(updates).toHaveLength(0);
    });

    it('includes instances where shouldTrack returns true', () => {
      const { ng, fireEvent } = makeNgWithProfiler();
      const onUpdates = vi.fn();
      const instance = {};

      createTickProfiler({ ng, body, shouldTrack: () => true, onUpdates });

      fireEvent(PE.ChangeDetectionStart);
      fireEvent(PE.ChangeDetectionSyncStart);
      fireEvent(PE.TemplateUpdateStart, instance);
      fireEvent(PE.ChangeDetectionSyncEnd);
      fireEvent(PE.ChangeDetectionEnd);

      const [updates] = onUpdates.mock.calls[0] as [PendingUpdate[]];
      expect(updates).toHaveLength(1);
    });
  });
});
