export const DASHBOARD_REFRESH_INTERVAL_MS = 15_000;

interface VisibilitySource {
  readonly hidden: boolean;
  addEventListener(type: 'visibilitychange', listener: () => void): void;
  removeEventListener(type: 'visibilitychange', listener: () => void): void;
}

interface DashboardAutoRefreshOptions {
  refresh: () => Promise<void>;
  visibilitySource: VisibilitySource;
  intervalMs?: number;
}

export interface DashboardAutoRefresh {
  start(): void;
  refreshNow(): Promise<void>;
  stop(): void;
}

export function createDashboardAutoRefresh({
  refresh,
  visibilitySource,
  intervalMs = DASHBOARD_REFRESH_INTERVAL_MS,
}: DashboardAutoRefreshOptions): DashboardAutoRefresh {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running = false;
  let stopped = true;

  function cancelPending(): void {
    if (timer === undefined) return;
    clearTimeout(timer);
    timer = undefined;
  }

  function scheduleNext(): void {
    cancelPending();
    if (stopped || visibilitySource.hidden) return;
    timer = setTimeout(() => {
      timer = undefined;
      void runAndSchedule();
    }, intervalMs);
  }

  async function runAndSchedule(): Promise<void> {
    if (stopped || visibilitySource.hidden || running) return;
    running = true;
    try {
      await refresh();
    } finally {
      running = false;
      scheduleNext();
    }
  }

  function handleVisibilityChange(): void {
    if (visibilitySource.hidden) {
      cancelPending();
      return;
    }
    void refreshNow();
  }

  async function refreshNow(): Promise<void> {
    cancelPending();
    await runAndSchedule();
  }

  return {
    start(): void {
      if (!stopped) return;
      stopped = false;
      visibilitySource.addEventListener(
        'visibilitychange',
        handleVisibilityChange,
      );
      void runAndSchedule();
    },
    refreshNow,
    stop(): void {
      if (stopped) return;
      stopped = true;
      cancelPending();
      visibilitySource.removeEventListener(
        'visibilitychange',
        handleVisibilityChange,
      );
    },
  };
}
