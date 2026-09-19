import { jest } from '@jest/globals';
import { ListingObservationCheckpointWorker } from './listing-observation-checkpoint.worker';

describe('ListingObservationCheckpointWorker', () => {
  afterEach(() => jest.useRealTimers());

  it('remains inactive by default when disabled', async () => {
    jest.useFakeTimers();
    const runOnce = jest.fn(() => Promise.resolve(emptyResult));
    const worker = createWorker(runOnce, false);

    worker.onModuleInit();
    await jest.advanceTimersByTimeAsync(20_000);

    expect(runOnce).not.toHaveBeenCalled();
    await worker.onModuleDestroy();
  });

  it('runs completion-relative cycles without overlap', async () => {
    jest.useFakeTimers();
    let finishFirst: ((value: typeof emptyResult) => void) | undefined;
    const firstRun = new Promise<typeof emptyResult>((resolve) => {
      finishFirst = resolve;
    });
    const runOnce = jest
      .fn<() => Promise<typeof emptyResult>>()
      .mockReturnValueOnce(firstRun)
      .mockResolvedValueOnce(emptyResult);
    const worker = createWorker(runOnce, true);

    worker.onModuleInit();
    await jest.advanceTimersByTimeAsync(5_000);
    expect(runOnce).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(20_000);
    expect(runOnce).toHaveBeenCalledTimes(1);

    finishFirst?.(emptyResult);
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(4_999);
    expect(runOnce).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(1);
    expect(runOnce).toHaveBeenCalledTimes(2);

    await worker.onModuleDestroy();
  });

  it('continues scheduling after a cycle-level failure', async () => {
    jest.useFakeTimers();
    const runOnce = jest
      .fn<() => Promise<typeof emptyResult>>()
      .mockRejectedValueOnce(new Error('claim failed'))
      .mockResolvedValueOnce(emptyResult);
    const worker = createWorker(runOnce, true);

    worker.onModuleInit();
    await jest.advanceTimersByTimeAsync(5_000);
    await jest.advanceTimersByTimeAsync(5_000);
    expect(runOnce).toHaveBeenCalledTimes(2);

    await worker.onModuleDestroy();
  });

  it('cancels a pending timer on shutdown', async () => {
    jest.useFakeTimers();
    const runOnce = jest.fn(() => Promise.resolve(emptyResult));
    const worker = createWorker(runOnce, true);

    worker.onModuleInit();
    await worker.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(5_000);

    expect(runOnce).not.toHaveBeenCalled();
  });
});

const emptyResult = { claimed: 0, completed: 0, failed: 0, lostLease: 0 };

function createWorker(
  runOnce: jest.Mock<() => Promise<typeof emptyResult>>,
  enabled: boolean,
): ListingObservationCheckpointWorker {
  return new ListingObservationCheckpointWorker(
    { runOnce } as never,
    {} as never,
    { enabled, intervalMs: 5_000, batchSize: 25, leaseDurationMs: 30_000 },
  );
}
