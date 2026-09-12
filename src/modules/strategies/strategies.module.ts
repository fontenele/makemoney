import { Module } from '@nestjs/common';
import { MovingAverageCrossoverStrategy } from './application/moving-average-crossover.strategy';
import { MarketDataModule } from '../market-data/market-data.module';
import { LiveStrategyEvaluationService } from './application/live-strategy-evaluation.service';
import { MOVING_AVERAGE_CROSSOVER_STRATEGY } from './domain/strategy';

@Module({
  imports: [MarketDataModule],
  providers: [
    {
      provide: MOVING_AVERAGE_CROSSOVER_STRATEGY,
      useFactory: () => new MovingAverageCrossoverStrategy(),
    },
    LiveStrategyEvaluationService,
  ],
  exports: [MOVING_AVERAGE_CROSSOVER_STRATEGY],
})
export class StrategiesModule {}
