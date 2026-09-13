import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StrategiesModule } from '../strategies/strategies.module';
import { HistoricalStrategyReplayService } from './application/historical-strategy-replay.service';
import { BacktestTradeSimulator } from './application/backtest-trade-simulator';
import { BacktestPerformanceCalculator } from './application/backtest-performance-calculator';
import { BacktestEndingValuationCalculator } from './application/backtest-ending-valuation-calculator';
import { BacktestRealizedDrawdownCalculator } from './application/backtest-realized-drawdown-calculator';
import { BacktestEquityCalculator } from './application/backtest-equity-calculator';
import { BacktestTimeMetricsCalculator } from './application/backtest-time-metrics-calculator';
import { BacktestExecutionRulesValidator } from './application/backtest-execution-rules-validator';
import { BacktestFillPriceCalculator } from './application/backtest-fill-price-calculator';
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
    BacktestRealizedDrawdownCalculator,
    BacktestEndingValuationCalculator,
    BacktestEquityCalculator,
    BacktestTimeMetricsCalculator,
    BacktestExecutionRulesValidator,
    BacktestFillPriceCalculator,
    BacktestTradeSimulator,
    HistoricalStrategyReplayService,
  ],
  exports: [StrategyReplayService, HistoricalStrategyReplayService],
})
export class BacktestingModule {}
