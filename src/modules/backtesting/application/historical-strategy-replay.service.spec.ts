import { jest } from '@jest/globals';
import { StrategyCandle } from '../../strategies/domain/strategy';
import { BacktestResult } from '../domain/backtest';
import {
  HistoricalCandleProvider,
  HistoricalCandleRequest,
} from '../domain/historical-candle-provider';
import { HistoricalStrategyReplayService } from './historical-strategy-replay.service';
import { StrategyReplayService } from './strategy-replay.service';

describe('HistoricalStrategyReplayService', () => {
  it('loads normalized candles and delegates deterministic replay', async () => {
    const candles: StrategyCandle[] = [candle()];
    const result = { candleCount: 1 } as BacktestResult;
    const provider: HistoricalCandleProvider = {
      load: jest.fn(() => Promise.resolve(candles)),
    };
    const replayService = {
      run: jest.fn(() => result),
    } as unknown as StrategyReplayService;
    const service = new HistoricalStrategyReplayService(
      provider,
      replayService,
    );
    const request: HistoricalCandleRequest = {
      symbol: 'BTC/USDT',
      interval: '1m',
      startTime: new Date('2026-09-12T12:00:00.000Z'),
      endTime: new Date('2026-09-12T12:01:00.000Z'),
      limit: 2,
    };
    const signal = new AbortController().signal;

    await expect(service.run(request, signal)).resolves.toBe(result);
    expect((provider.load as jest.Mock).mock.calls[0]).toEqual([
      request,
      signal,
    ]);
    expect((replayService.run as unknown as jest.Mock).mock.calls[0]).toEqual([
      candles,
    ]);
  });
});

function candle(): StrategyCandle {
  return {
    symbol: 'BTC/USDT',
    interval: '1m',
    closePrice: '100',
    openTime: new Date('2026-09-12T12:00:00.000Z'),
    closeTime: new Date('2026-09-12T12:00:59.999Z'),
    isClosed: true,
  };
}
