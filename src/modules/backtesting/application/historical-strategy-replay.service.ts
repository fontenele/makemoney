import { Inject, Injectable } from '@nestjs/common';
import { BacktestResult } from '../domain/backtest';
import {
  HISTORICAL_CANDLE_PROVIDER,
  HistoricalCandleProvider,
  HistoricalCandleRequest,
} from '../domain/historical-candle-provider';
import { StrategyReplayService } from './strategy-replay.service';

@Injectable()
export class HistoricalStrategyReplayService {
  constructor(
    @Inject(HISTORICAL_CANDLE_PROVIDER)
    private readonly candleProvider: HistoricalCandleProvider,
    private readonly replayService: StrategyReplayService,
  ) {}

  async run(
    request: HistoricalCandleRequest,
    signal?: AbortSignal,
  ): Promise<BacktestResult> {
    const candles = await this.candleProvider.load(request, signal);
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
