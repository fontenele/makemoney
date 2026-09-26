import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createDashboardAutoRefresh,
  DASHBOARD_REFRESH_INTERVAL_MS,
} from './auto-refresh';

class FakeVisibilitySource {
  hidden = false;
  private listener?: () => void;

  addEventListener(_type: 'visibilitychange', listener: () => void): void {
    this.listener = listener;
  }

  removeEventListener(_type: 'visibilitychange', listener: () => void): void {
    if (this.listener === listener) this.listener = undefined;
  }

  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    this.listener?.();
  }
}

describe('dashboard auto refresh', () => {
  afterEach(() => vi.useRealTimers());

  it('loads immediately and schedules the next load after completion', async () => {
    vi.useFakeTimers();
    const refresh = vi.fn(() => Promise.resolve());
    const scheduler = createDashboardAutoRefresh({
      refresh,
      visibilitySource: new FakeVisibilitySource(),
    });

    scheduler.start();
    await vi.runAllTicks();
    expect(refresh).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(DASHBOARD_REFRESH_INTERVAL_MS);
    expect(refresh).toHaveBeenCalledTimes(2);

    scheduler.stop();
  });

  it('never overlaps refreshes', async () => {
    vi.useFakeTimers();
    let finishRefresh: (() => void) | undefined;
    const refresh = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishRefresh = resolve;
        }),
    );
    const scheduler = createDashboardAutoRefresh({
      refresh,
      visibilitySource: new FakeVisibilitySource(),
    });

    scheduler.start();
    await scheduler.refreshNow();
    expect(refresh).toHaveBeenCalledTimes(1);

    finishRefresh?.();
    await vi.runAllTicks();
    scheduler.stop();
  });

  it('pauses while hidden and refreshes when visible again', async () => {
    vi.useFakeTimers();
    const visibility = new FakeVisibilitySource();
    const refresh = vi.fn(() => Promise.resolve());
    const scheduler = createDashboardAutoRefresh({
      refresh,
      visibilitySource: visibility,
    });

    scheduler.start();
    await vi.runAllTicks();
    visibility.setHidden(true);
    await vi.advanceTimersByTimeAsync(DASHBOARD_REFRESH_INTERVAL_MS * 2);
    expect(refresh).toHaveBeenCalledTimes(1);

    visibility.setHidden(false);
    await vi.runAllTicks();
    expect(refresh).toHaveBeenCalledTimes(2);

    scheduler.stop();
  });
});
