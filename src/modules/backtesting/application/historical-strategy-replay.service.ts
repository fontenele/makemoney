import { Inject, Injectable } from '@nestjs/common';
import { BacktestResult } from '../domain/backtest';
import {
  BacktestSimulationConfiguration,
  HistoricalBacktestSimulationResult,
} from '../domain/backtest-simulation';
import { HistoricalCandle } from '../domain/historical-candle';
import {
  HISTORICAL_CANDLE_PROVIDER,
  HistoricalCandleProvider,
  HistoricalCandleRequest,
} from '../domain/historical-candle-provider';
import { StrategyReplayService } from './strategy-replay.service';
import { BacktestTradeSimulator } from './backtest-trade-simulator';

@Injectable()
export class HistoricalStrategyReplayService {
  constructor(
    @Inject(HISTORICAL_CANDLE_PROVIDER)
    private readonly candleProvider: HistoricalCandleProvider,
    private readonly replayService: StrategyReplayService,
    private readonly tradeSimulator: BacktestTradeSimulator,
  ) {}

  async run(
    request: HistoricalCandleRequest,
    signal?: AbortSignal,
  ): Promise<BacktestResult> {
    const candles = await this.candleProvider.load(request, signal);
    return this.replay(candles);
  }

  async runSimulation(
    request: HistoricalCandleRequest,
    configuration: BacktestSimulationConfiguration,
    signal?: AbortSignal,
  ): Promise<HistoricalBacktestSimulationResult> {
    const candles = await this.candleProvider.load(request, signal);
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
}
