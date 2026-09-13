import { jest } from '@jest/globals';
import { BacktestResult } from '../domain/backtest';
import { BacktestSimulationConfiguration } from '../domain/backtest-simulation';
import { HistoricalCandle } from '../domain/historical-candle';
import { HistoricalCandleRepository } from '../domain/historical-candle-repository';
import {
  HistoricalCandleProvider,
  HistoricalCandleRequest,
} from '../domain/historical-candle-provider';
import { HistoricalStrategyReplayService } from './historical-strategy-replay.service';
import { StrategyReplayService } from './strategy-replay.service';
import { BacktestTradeSimulator } from './backtest-trade-simulator';

describe('HistoricalStrategyReplayService', () => {
  it('loads normalized candles and delegates deterministic replay', async () => {
    const candles: HistoricalCandle[] = [candle()];
    const result = { candleCount: 1 } as BacktestResult;
    const provider: HistoricalCandleProvider = {
      load: jest.fn(() => Promise.resolve(candles)),
    };
    const replayService = {
      run: jest.fn(() => result),
    } as unknown as StrategyReplayService;
    const tradeSimulator = {
      simulate: jest.fn(),
    } as unknown as BacktestTradeSimulator;
    const candleRepository: HistoricalCandleRepository = {
      saveMany: jest.fn(() => Promise.resolve()),
      findRange: jest.fn(() => Promise.resolve(candles)),
    };
    const service = new HistoricalStrategyReplayService(
      provider,
      replayService,
      tradeSimulator,
      candleRepository,
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
    expect((candleRepository.saveMany as jest.Mock).mock.calls[0]).toEqual([
      candles,
    ]);
    expect((replayService.run as unknown as jest.Mock).mock.calls[0]).toEqual([
      [
        {
          symbol: 'BTC/USDT',
          interval: '1m',
          closePrice: '100',
          openTime: candles[0]?.openTime,
          closeTime: candles[0]?.closeTime,
          isClosed: true,
        },
      ],
    ]);
  });

  it('loads once and combines replay with next-open simulation', async () => {
    const candles: HistoricalCandle[] = [candle()];
    const replay = { signals: [] } as unknown as BacktestResult;
    const simulation = { fills: [] } as never;
    const provider: HistoricalCandleProvider = {
      load: jest.fn(() => Promise.resolve(candles)),
    };
    const replayService = {
      run: jest.fn(() => replay),
    } as unknown as StrategyReplayService;
    const tradeSimulator = {
      simulate: jest.fn(() => simulation),
    } as unknown as BacktestTradeSimulator;
    const candleRepository: HistoricalCandleRepository = {
      saveMany: jest.fn(() => Promise.resolve()),
      findRange: jest.fn(() => Promise.resolve(candles)),
    };
    const service = new HistoricalStrategyReplayService(
      provider,
      replayService,
      tradeSimulator,
      candleRepository,
    );
    const request: HistoricalCandleRequest = {
      symbol: 'BTC/USDT',
      interval: '1m',
      startTime: new Date('2026-09-12T12:00:00.000Z'),
      endTime: new Date('2026-09-12T12:01:00.000Z'),
      limit: 2,
    };
    const configuration = {
      quantity: '0.001',
      feeRate: '0.001',
      spreadRate: '0',
      slippageRate: '0',
      maximumVolumeParticipationRate: '1',
      initialCapitalUsdt: '1000',
      executionRules: {
        minQuantity: '0.00001',
        maxQuantity: '1000',
        stepSize: '0.00001',
        minNotional: '0.00001',
        tickSize: '0.00000001',
        minPrice: '0.00000001',
        maxPrice: '1000000000',
      },
    };

    await expect(
      service.runSimulation(request, configuration),
    ).resolves.toEqual({
      replay,
      simulation,
    });
    expect((provider.load as jest.Mock).mock.calls).toHaveLength(1);
    expect((candleRepository.saveMany as jest.Mock).mock.calls[0]).toEqual([
      candles,
    ]);
    expect(
      (tradeSimulator.simulate as unknown as jest.Mock).mock.calls[0],
    ).toEqual([candles, replay.signals, configuration]);
  });

  it('replays and simulates stored candles without loading Binance', async () => {
    const candles: HistoricalCandle[] = [candle()];
    const replay = { signals: [] } as unknown as BacktestResult;
    const simulation = { fills: [] } as never;
    const load = jest.fn(() => Promise.resolve(candles));
    const provider: HistoricalCandleProvider = { load };
    const replayRun = jest.fn(() => replay);
    const replayService = {
      run: replayRun,
    } as unknown as StrategyReplayService;
    const simulate = jest.fn(() => simulation);
    const tradeSimulator = {
      simulate,
    } as unknown as BacktestTradeSimulator;
    const findRange = jest.fn(() => Promise.resolve(candles));
    const candleRepository: HistoricalCandleRepository = {
      saveMany: jest.fn(() => Promise.resolve()),
      findRange,
    };
    const service = new HistoricalStrategyReplayService(
      provider,
      replayService,
      tradeSimulator,
      candleRepository,
    );
    const request: HistoricalCandleRequest = {
      symbol: 'BTC/USDT',
      interval: '1m',
      startTime: new Date('2026-09-12T12:00:00.000Z'),
      endTime: new Date('2026-09-12T12:01:00.000Z'),
      limit: 2,
    };
    const configuration = {} as BacktestSimulationConfiguration;

    await expect(service.runStored(request)).resolves.toBe(replay);
    await expect(
      service.runStoredSimulation(request, configuration),
    ).resolves.toEqual({ replay, simulation });
    expect(findRange.mock.calls).toEqual([[request], [request]]);
    expect(load).not.toHaveBeenCalled();
    expect(simulate).toHaveBeenCalledWith(
      candles,
      replay.signals,
      configuration,
    );
  });

  it('does not replay or simulate when persistence fails', async () => {
    const candles: HistoricalCandle[] = [candle()];
    const persistenceError = new Error('persistence failed');
    const provider: HistoricalCandleProvider = {
      load: jest.fn(() => Promise.resolve(candles)),
    };
    const replay = jest.fn();
    const replayService = { run: replay } as unknown as StrategyReplayService;
    const simulate = jest.fn();
    const tradeSimulator = {
      simulate,
    } as unknown as BacktestTradeSimulator;
    const candleRepository: HistoricalCandleRepository = {
      saveMany: jest.fn(() => Promise.reject(persistenceError)),
      findRange: jest.fn(() => Promise.resolve(candles)),
    };
    const service = new HistoricalStrategyReplayService(
      provider,
      replayService,
      tradeSimulator,
      candleRepository,
    );
    const request: HistoricalCandleRequest = {
      symbol: 'BTC/USDT',
      interval: '1m',
      startTime: new Date('2026-09-12T12:00:00.000Z'),
      endTime: new Date('2026-09-12T12:01:00.000Z'),
      limit: 2,
    };

    await expect(service.run(request)).rejects.toBe(persistenceError);
    expect(replay).not.toHaveBeenCalled();
    expect(simulate).not.toHaveBeenCalled();
  });
});

function candle(): HistoricalCandle {
  return {
    symbol: 'BTC/USDT',
    interval: '1m',
    openPrice: '99',
    highPrice: '102',
    lowPrice: '98',
    closePrice: '100',
    baseVolume: '1.5',
    quoteVolume: '150',
    takerBuyBaseVolume: '0.75',
    takerBuyQuoteVolume: '75',
    tradeCount: 10,
    openTime: new Date('2026-09-12T12:00:00.000Z'),
    closeTime: new Date('2026-09-12T12:00:59.999Z'),
    isClosed: true,
  };
}
