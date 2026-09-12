import { Module } from '@nestjs/common';
import { MovingAverageCrossoverStrategy } from './application/moving-average-crossover.strategy';
import { MarketDataModule } from '../market-data/market-data.module';
import { LiveStrategyEvaluationService } from './application/live-strategy-evaluation.service';
import { MOVING_AVERAGE_CROSSOVER_STRATEGY } from './domain/strategy';
import { LatestStrategySignalService } from './application/latest-strategy-signal.service';
import { StrategiesController } from './presentation/strategies.controller';

@Module({
  imports: [MarketDataModule],
  controllers: [StrategiesController],
  providers: [
    {
      provide: MOVING_AVERAGE_CROSSOVER_STRATEGY,
      useFactory: () => new MovingAverageCrossoverStrategy(),
    },
    LiveStrategyEvaluationService,
    LatestStrategySignalService,
  ],
  exports: [MOVING_AVERAGE_CROSSOVER_STRATEGY],
})
export class StrategiesModule {}
