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

    const candles = await this.candleProvider.load(request, signal);
    await this.candleRepository.saveMany(candles);
    return candles;
  }
}
