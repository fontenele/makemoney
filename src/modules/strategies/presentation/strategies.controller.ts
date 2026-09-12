import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { LatestStrategySignalService } from '../application/latest-strategy-signal.service';
import { StrategySignal } from '../domain/strategy';

@Controller('strategies')
export class StrategiesController {
  constructor(private readonly latestSignal: LatestStrategySignalService) {}

  @Get('signals/latest')
  getLatestSignal(): StrategySignal {
    const signal = this.latestSignal.getLatest();
    if (!signal) {
      throw new ServiceUnavailableException({
        message: 'No strategy signal is available yet',
        reason: 'strategy_signal_unavailable',
      });
    }
    return signal;
  }
}
