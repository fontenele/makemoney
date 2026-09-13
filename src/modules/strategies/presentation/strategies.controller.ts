import {
  BadRequestException,
  Controller,
  Get,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DEFAULT_STRATEGY_SIGNAL_HISTORY_LIMIT,
  MAX_STRATEGY_SIGNAL_HISTORY_LIMIT,
  StrategySignalReadModelService,
} from '../application/strategy-signal-read-model.service';
import { StrategySignal } from '../domain/strategy';

@Controller('strategies')
export class StrategiesController {
  constructor(private readonly signals: StrategySignalReadModelService) {}

  @Get('signals')
  listSignals(@Query('limit') limit?: string): Promise<StrategySignal[]> {
    if (limit === undefined) {
      return this.signals.listRecent(DEFAULT_STRATEGY_SIGNAL_HISTORY_LIMIT);
    }
    if (!/^[1-9]\d*$/.test(limit)) {
      throw new BadRequestException('limit must be an integer from 1 to 100');
    }
    const parsedLimit = Number(limit);
    if (parsedLimit > MAX_STRATEGY_SIGNAL_HISTORY_LIMIT) {
      throw new BadRequestException('limit must be an integer from 1 to 100');
    }
    return this.signals.listRecent(parsedLimit);
  }

  @Get('signals/latest')
  async getLatestSignal(): Promise<StrategySignal> {
    const signal = await this.signals.getLatest();
    if (!signal) {
      throw new ServiceUnavailableException({
        message: 'No strategy signal is available yet',
        reason: 'strategy_signal_unavailable',
      });
    }
    return signal;
  }
}
