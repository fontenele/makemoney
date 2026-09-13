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
import { BacktestLiquidityCalculator } from './application/backtest-liquidity-calculator';
import { StrategyReplayService } from './application/strategy-replay.service';
import { HISTORICAL_CANDLE_PROVIDER } from './domain/historical-candle-provider';
import { HISTORICAL_CANDLE_REPOSITORY } from './domain/historical-candle-repository';
import { BinanceHistoricalCandlesClient } from './infrastructure/binance/binance-historical-candles.client';
import { PrismaHistoricalCandleRepository } from './infrastructure/prisma-historical-candle.repository';
import { HistoricalCandleCoverage } from './application/historical-candle-coverage';
import { HistoricalCandleGapPlanner } from './application/historical-candle-gap-planner';
import { BacktestingController } from './presentation/backtesting.controller';
import { BacktestSimulationRequestValidator } from './application/backtest-simulation-request-validator';
import { BacktestRunService } from './application/backtest-run.service';
import { BACKTEST_RUN_REPOSITORY } from './domain/backtest-run';
import { PrismaBacktestRunRepository } from './infrastructure/prisma-backtest-run.repository';

@Module({
  imports: [StrategiesModule],
  controllers: [BacktestingController],
  providers: [
    {
      provide: HISTORICAL_CANDLE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): BinanceHistoricalCandlesClient =>
        new BinanceHistoricalCandlesClient(
          config.getOrThrow<string>('BINANCE_REST_BASE_URL'),
        ),
    },
    {
      provide: HISTORICAL_CANDLE_REPOSITORY,
      useClass: PrismaHistoricalCandleRepository,
    },
    {
      provide: BACKTEST_RUN_REPOSITORY,
      useClass: PrismaBacktestRunRepository,
    },
    StrategyReplayService,
    BacktestPerformanceCalculator,
    BacktestRealizedDrawdownCalculator,
    BacktestEndingValuationCalculator,
    BacktestEquityCalculator,
    BacktestTimeMetricsCalculator,
    BacktestExecutionRulesValidator,
    BacktestFillPriceCalculator,
    BacktestLiquidityCalculator,
    HistoricalCandleCoverage,
    HistoricalCandleGapPlanner,
    BacktestSimulationRequestValidator,
    BacktestRunService,
    BacktestTradeSimulator,
    HistoricalStrategyReplayService,
  ],
  exports: [StrategyReplayService, HistoricalStrategyReplayService],
})
export class BacktestingModule {}
