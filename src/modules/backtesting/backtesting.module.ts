import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StrategiesModule } from '../strategies/strategies.module';
import { HistoricalStrategyReplayService } from './application/historical-strategy-replay.service';
import { BacktestTradeSimulator } from './application/backtest-trade-simulator';
import { BacktestPerformanceCalculator } from './application/backtest-performance-calculator';
import { StrategyReplayService } from './application/strategy-replay.service';
import { HISTORICAL_CANDLE_PROVIDER } from './domain/historical-candle-provider';
import { BinanceHistoricalCandlesClient } from './infrastructure/binance/binance-historical-candles.client';

@Module({
  imports: [StrategiesModule],
  providers: [
    {
      provide: HISTORICAL_CANDLE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): BinanceHistoricalCandlesClient =>
        new BinanceHistoricalCandlesClient(
          config.getOrThrow<string>('BINANCE_REST_BASE_URL'),
        ),
    },
    StrategyReplayService,
    BacktestPerformanceCalculator,
    BacktestTradeSimulator,
    HistoricalStrategyReplayService,
  ],
  exports: [StrategyReplayService, HistoricalStrategyReplayService],
})
export class BacktestingModule {}
