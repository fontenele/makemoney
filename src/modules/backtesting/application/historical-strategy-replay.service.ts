import { Inject, Injectable } from '@nestjs/common';
import { BacktestResult } from '../domain/backtest';
import {
  BacktestSimulationConfiguration,
  HistoricalBacktestSimulationResult,
} from '../domain/backtest-simulation';
import { HistoricalCandle } from '../domain/historical-candle';
import {
  HISTORICAL_CANDLE_REPOSITORY,
  HistoricalCandleRepository,
} from '../domain/historical-candle-repository';
import {
  HISTORICAL_CANDLE_PROVIDER,
  HistoricalCandleProvider,
  HistoricalCandleRequest,
} from '../domain/historical-candle-provider';
import { StrategyReplayService } from './strategy-replay.service';
import { BacktestTradeSimulator } from './backtest-trade-simulator';
import { HistoricalCandleCoverage } from './historical-candle-coverage';
import { HistoricalCandleGapPlanner } from './historical-candle-gap-planner';

export class IncompleteHistoricalCandleCoverageError extends Error {
  constructor() {
    super('Historical candle coverage remains incomplete after gap loading');
  }
}

@Injectable()
export class HistoricalStrategyReplayService {
  constructor(
    @Inject(HISTORICAL_CANDLE_PROVIDER)
    private readonly candleProvider: HistoricalCandleProvider,
    private readonly replayService: StrategyReplayService,
    private readonly tradeSimulator: BacktestTradeSimulator,
    @Inject(HISTORICAL_CANDLE_REPOSITORY)
    private readonly candleRepository: HistoricalCandleRepository,
    private readonly candleCoverage: HistoricalCandleCoverage,
    private readonly gapPlanner: HistoricalCandleGapPlanner,
  ) {}

  async run(
    request: HistoricalCandleRequest,
    signal?: AbortSignal,
  ): Promise<BacktestResult> {
    const candles = await this.loadAndPersist(request, signal);
    return this.replay(candles);
  }

  async runSimulation(
    request: HistoricalCandleRequest,
    configuration: BacktestSimulationConfiguration,
    signal?: AbortSignal,
  ): Promise<HistoricalBacktestSimulationResult> {
    const candles = await this.loadAndPersist(request, signal);
    const replay = this.replay(candles);
    return {
      replay,
      simulation: this.tradeSimulator.simulate(
        candles,
        replay.signals,
        configuration,
      ),
    };
  }

  async runStored(request: HistoricalCandleRequest): Promise<BacktestResult> {
    const candles = await this.candleRepository.findRange(request);
    return this.replay(candles);
  }

  async runStoredSimulation(
    request: HistoricalCandleRequest,
    configuration: BacktestSimulationConfiguration,
  ): Promise<HistoricalBacktestSimulationResult> {
    const candles = await this.candleRepository.findRange(request);
    const replay = this.replay(candles);
    return {
      replay,
      simulation: this.tradeSimulator.simulate(
        candles,
        replay.signals,
        configuration,
      ),
    };
  }

  private replay(candles: readonly HistoricalCandle[]): BacktestResult {
    return this.replayService.run(
      candles.map((candle) => ({
        symbol: candle.symbol,
        interval: candle.interval,
        closePrice: candle.closePrice,
        openTime: candle.openTime,
        closeTime: candle.closeTime,
        isClosed: candle.isClosed,
      })),
    );
  }

  private async loadAndPersist(
    request: HistoricalCandleRequest,
    signal?: AbortSignal,
  ): Promise<HistoricalCandle[]> {
    const storedCandles = await this.candleRepository.findRange(request);
    if (this.candleCoverage.isComplete(request, storedCandles)) {
      return storedCandles;
    }

    const gaps = this.gapPlanner.plan(request, storedCandles);
    const fetchedCandles: HistoricalCandle[] = [];
    for (const gap of gaps) {
      fetchedCandles.push(...(await this.candleProvider.load(gap, signal)));
    }

    const candles = this.mergeCandles(storedCandles, fetchedCandles);
    if (!this.candleCoverage.isComplete(request, candles)) {
      throw new IncompleteHistoricalCandleCoverageError();
    }

    await this.candleRepository.saveMany(fetchedCandles);
    return candles;
  }

  private mergeCandles(
    storedCandles: readonly HistoricalCandle[],
    fetchedCandles: readonly HistoricalCandle[],
  ): HistoricalCandle[] {
    const candlesByOpenTime = new Map<number, HistoricalCandle>();
    for (const candle of [...storedCandles, ...fetchedCandles]) {
      const openTime = candle.openTime.getTime();
      if (candlesByOpenTime.has(openTime)) {
        throw new Error(
          'Historical candle sources contain duplicate identities',
        );
      }
      candlesByOpenTime.set(openTime, candle);
    }
    return [...candlesByOpenTime.values()].sort(
      (left, right) => left.openTime.getTime() - right.openTime.getTime(),
    );
  }
}
