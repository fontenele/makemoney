import { jest } from '@jest/globals';
import {
  BacktestRunIdempotencyConflictError,
  BacktestRunRepository,
} from '../domain/backtest-run';
import { HistoricalStrategyReplayService } from './historical-strategy-replay.service';
import { BacktestRunService } from './backtest-run.service';

describe('BacktestRunService', () => {
  it('returns an identical existing run without recalculating', async () => {
    const existing = storedRun();
    const repository = repositoryWith({
      findByIdempotencyKey: jest.fn(() => Promise.resolve(existing)),
    });
    const runSimulation = jest.fn();
    const service = new BacktestRunService(
      { runSimulation } as unknown as HistoricalStrategyReplayService,
      repository,
    );

    await expect(
      service.create('run-1', request(), configuration()),
    ).resolves.toMatchObject({
      id: existing.id,
      replayed: true,
    });
    expect(runSimulation).not.toHaveBeenCalled();
    // Repository methods are Jest mocks in this test fixture.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('rejects conflicting reuse before recalculating', async () => {
    const repository = repositoryWith({
      findByIdempotencyKey: jest.fn(() =>
        Promise.resolve({ ...storedRun(), requestFingerprint: 'different' }),
      ),
    });
    const runSimulation = jest.fn();
    const service = new BacktestRunService(
      { runSimulation } as unknown as HistoricalStrategyReplayService,
      repository,
    );
    await expect(
      service.create('run-1', request(), configuration()),
    ).rejects.toBeInstanceOf(BacktestRunIdempotencyConflictError);
    expect(runSimulation).not.toHaveBeenCalled();
  });

  it('serializes and persists a newly completed simulation', async () => {
    const repository = repositoryWith();
    const result = {
      replay: { startedAt: new Date('2026-09-01T00:00:00.000Z') },
    };
    const service = new BacktestRunService(
      {
        runSimulation: jest.fn(() => Promise.resolve(result)),
      } as unknown as HistoricalStrategyReplayService,
      repository,
    );
    await expect(
      service.create('run-1', request(), configuration()),
    ).resolves.toMatchObject({
      id: '00000000-0000-0000-0000-000000000001',
      replayed: false,
      result: { replay: { startedAt: '2026-09-01T00:00:00.000Z' } },
    });
    // Repository methods are Jest mocks in this test fixture.
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(repository.create).toHaveBeenCalledTimes(1);
  });
});

function repositoryWith(
  change: Partial<BacktestRunRepository> = {},
): BacktestRunRepository {
  return {
    findByIdempotencyKey: jest.fn(() => Promise.resolve(undefined)),
    create: jest.fn<BacktestRunRepository['create']>((run) =>
      Promise.resolve({
        run: { ...run, id: storedRun().id, createdAt: storedRun().createdAt },
        replayed: false,
      }),
    ),
    ...change,
  };
}

function storedRun() {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    idempotencyKey: 'run-1',
    requestFingerprint:
      '58ac3c575907c2e14d4a282675245dec5bc76fd3ca5e9f91ec2c2822a92a2ad8',
    request: {},
    result: {},
    createdAt: new Date('2026-09-13T20:30:00.000Z'),
  };
}

function request() {
  return {
    symbol: 'BTC/USDT' as const,
    interval: '1m' as const,
    startTime: new Date('2026-09-01T00:00:00.000Z'),
    endTime: new Date('2026-09-01T00:00:00.000Z'),
    limit: 1,
  };
}

function configuration() {
  return {
    quantity: '0.001',
    feeRate: '0.001',
    spreadRate: '0',
    slippageRate: '0',
    maximumVolumeParticipationRate: '1',
    initialCapitalUsdt: '1000',
    executionRules: {
      minQuantity: '0.00001',
      maxQuantity: '1',
      stepSize: '0.00001',
      minNotional: '5',
      tickSize: '0.01',
      minPrice: '0.01',
      maxPrice: '1000000',
    },
  };
}
