import { Module } from '@nestjs/common';
import { StrategiesModule } from '../strategies/strategies.module';
import { StrategyReplayService } from './application/strategy-replay.service';

@Module({
  imports: [StrategiesModule],
  providers: [StrategyReplayService],
  exports: [StrategyReplayService],
})
export class BacktestingModule {}
