import { jest } from '@jest/globals';
import {
  ApprovalCleanupWatchService,
  CleanupWatchQueue,
  CleanupWatchMonitor,
} from './approval-cleanup-watch.service';
const now = new Date('2026-10-30T18:00:00.000Z');
function harness() {
  const queue = {
    list: jest.fn<CleanupWatchQueue['list']>().mockResolvedValue([]),
  };
  const monitor = {
    observe: jest.fn<CleanupWatchMonitor['observe']>().mockResolvedValue({
      status: 'unresolved',
      providerAccessPerformed: false,
    }),
  };
  return {
    queue,
    monitor,
    service: new ApprovalCleanupWatchService(
      queue,
      monitor,
      () => new Date(now),
    ),
  };
}
describe('Passive background cleanup watch', () => {
  it('serves cache only and never invents an empty initialized queue', () => {
    const t = harness();
    expect(t.service.read()).toMatchObject({
      status: 'warming_up',
      pendingCount: null,
      providerAccessPerformed: false,
      submissionAuthorized: false,
    });
    expect(t.queue.list).not.toHaveBeenCalled();
    expect(t.monitor.observe).not.toHaveBeenCalled();
  });
  it('observes an empty durable queue without provider access', async () => {
    const t = harness();
    await t.service.refresh();
    expect(t.service.read()).toMatchObject({
      status: 'idle',
      pendingCount: 0,
      states: {},
      lastCycleProviderReadPerformed: false,
    });
    expect(t.monitor.observe).not.toHaveBeenCalled();
  });
  it.each([
    'awaiting_operation',
    'ready',
    'claimed',
    'accepted',
    'submitted',
    'unknown',
    'failed',
  ])(
    'tracks unresolved %s without granting submission authority',
    async (state) => {
      const t = harness();
      t.queue.list.mockResolvedValue([{ walletHash: 'a'.repeat(64), state }]);
      await t.service.refresh();
      expect(t.service.read()).toMatchObject({
        status: 'unresolved',
        pendingCount: 1,
        states: { [state]: 1 },
        automaticRetryAllowed: false,
        submissionAuthorized: false,
      });
    },
  );
  it('re-reads the queue after a receipt is cleared', async () => {
    const t = harness();
    t.queue.list
      .mockResolvedValueOnce([
        { walletHash: 'a'.repeat(64), state: 'submitted' },
      ])
      .mockResolvedValueOnce([]);
    t.monitor.observe.mockResolvedValue({
      status: 'clear',
      providerAccessPerformed: true,
    });
    await t.service.refresh();
    expect(t.service.read()).toMatchObject({
      status: 'idle',
      pendingCount: 0,
      lastCycleProviderReadPerformed: true,
      providerAccessPerformed: false,
    });
  });
  it('sanitizes failures and clears stale counters rather than assuming zero', async () => {
    const t = harness();
    t.queue.list.mockRejectedValue(new Error('raw private dependency'));
    await t.service.refresh();
    const value = t.service.read();
    expect(value).toMatchObject({ status: 'unavailable', pendingCount: null });
    expect(JSON.stringify(value)).not.toContain('private');
  });
  it('does not observe an oversized or invalid wallet scope', async () => {
    const t = harness();
    t.queue.list.mockResolvedValue([
      { walletHash: 'a'.repeat(64), state: 'submitted' },
      { walletHash: 'b'.repeat(64), state: 'submitted' },
    ]);
    await t.service.refresh();
    expect(t.service.read().status).toBe('unavailable');
    expect(t.monitor.observe).not.toHaveBeenCalled();
  });
  it('marks old status stale without refreshing it on GET', async () => {
    const t = harness();
    let at = new Date(now);
    const service = new ApprovalCleanupWatchService(
      t.queue,
      t.monitor,
      () => at,
    );
    await service.refresh();
    at = new Date(now.getTime() + 90001);
    expect(service.read().status).toBe('stale');
    expect(t.queue.list).toHaveBeenCalledTimes(1);
  });
  it('schedules only observation and stops on shutdown', async () => {
    jest.useFakeTimers();
    const t = harness();
    try {
      t.service.onModuleInit();
      await jest.advanceTimersByTimeAsync(0);
      expect(t.queue.list).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(30000);
      expect(t.queue.list).toHaveBeenCalledTimes(2);
      t.service.onModuleDestroy();
      await jest.advanceTimersByTimeAsync(60000);
      expect(t.queue.list).toHaveBeenCalledTimes(2);
    } finally {
      t.service.onModuleDestroy();
      jest.useRealTimers();
    }
  });
});
