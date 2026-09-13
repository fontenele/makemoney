import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { BacktestResult } from '../domain/backtest';
import { HistoricalStrategyReplayService } from '../application/historical-strategy-replay.service';
import { BacktestingController } from './backtesting.controller';

describe('BacktestingController', () => {
  it('runs fixed BTC/USDT one-minute replay for a valid bounded request', async () => {
    const result = { candleCount: 1 } as BacktestResult;
    const run = jest.fn(() => Promise.resolve(result));
    const controller = new BacktestingController({
      run,
    } as unknown as HistoricalStrategyReplayService);

    await expect(
      controller.runReplay({
        startTime: '2026-09-01T00:00:00.000Z',
        endTime: '2026-09-01T00:00:00.000Z',
        limit: 1,
      }),
    ).resolves.toBe(result);
    expect(run).toHaveBeenCalledWith({
      symbol: 'BTC/USDT',
      interval: '1m',
      startTime: new Date('2026-09-01T00:00:00.000Z'),
      endTime: new Date('2026-09-01T00:00:00.000Z'),
      limit: 1,
    });
  });

  it.each([
    null,
    {},
    { startTime: '2026-09-01', endTime: '2026-09-01T00:00:00.000Z', limit: 1 },
    {
      startTime: '2026-09-01T00:01:00.000Z',
      endTime: '2026-09-01T00:00:00.000Z',
      limit: 1,
    },
    {
      startTime: '2026-09-01T00:00:00.000Z',
      endTime: '2026-09-01T00:00:00.000Z',
      limit: 10001,
    },
    {
      startTime: '2026-09-01T00:00:00.000Z',
      endTime: '2026-09-01T00:00:00.000Z',
      limit: 1,
      symbol: 'BTC/USDT',
    },
  ])('rejects an invalid public request %#', async (body) => {
    const controller = new BacktestingController({
      run: jest.fn(),
    } as unknown as HistoricalStrategyReplayService);
    await expect(controller.runReplay(body)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('maps internal loading failure to explicit service unavailability', async () => {
    const controller = new BacktestingController({
      run: jest.fn(() => Promise.reject(new Error('provider details'))),
    } as unknown as HistoricalStrategyReplayService);

    await expect(
      controller.runReplay({
        startTime: '2026-09-01T00:00:00.000Z',
        endTime: '2026-09-01T00:00:00.000Z',
        limit: 1,
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
