import { Module } from '@nestjs/common';
import { MovingAverageCrossoverStrategy } from './application/moving-average-crossover.strategy';

export const MOVING_AVERAGE_CROSSOVER_STRATEGY = Symbol(
  'MOVING_AVERAGE_CROSSOVER_STRATEGY',
);

@Module({
  providers: [
    {
      provide: MOVING_AVERAGE_CROSSOVER_STRATEGY,
      useFactory: () => new MovingAverageCrossoverStrategy(),
    },
  ],
  exports: [MOVING_AVERAGE_CROSSOVER_STRATEGY],
})
export class StrategiesModule {}
