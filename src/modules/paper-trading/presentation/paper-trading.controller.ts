import {
  BadRequestException,
  Controller,
  Get,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DEFAULT_EXECUTION_HISTORY_LIMIT,
  MAX_EXECUTION_HISTORY_LIMIT,
  PaperExecutionHistoryService,
} from '../application/paper-execution-history.service';
import { PaperExecution } from '../domain/trading-executor';
import {
  PaperPositionService,
  PositionMarketDataStaleError,
  PositionMarketDataUnavailableError,
} from '../application/paper-position.service';
import { PaperPosition } from '../domain/paper-position';

@Controller('paper-trading')
export class PaperTradingController {
  constructor(
    private readonly history: PaperExecutionHistoryService,
    private readonly position: PaperPositionService,
  ) {}

  @Get('executions')
  listExecutions(@Query('limit') limit?: string): Promise<PaperExecution[]> {
    if (limit === undefined) {
      return this.history.listRecent(DEFAULT_EXECUTION_HISTORY_LIMIT);
    }
    if (!/^[1-9]\d*$/.test(limit)) {
      throw new BadRequestException('limit must be an integer from 1 to 100');
    }

    const parsedLimit = Number(limit);
    if (parsedLimit > MAX_EXECUTION_HISTORY_LIMIT) {
      throw new BadRequestException('limit must be an integer from 1 to 100');
    }
    return this.history.listRecent(parsedLimit);
  }

  @Get('position')
  async getPosition(): Promise<PaperPosition> {
    try {
      return await this.position.getPosition();
    } catch (error) {
      if (error instanceof PositionMarketDataUnavailableError) {
        throw new ServiceUnavailableException({
          message: error.message,
          reason: 'top_of_book_unavailable',
        });
      }
      if (error instanceof PositionMarketDataStaleError) {
        throw new ServiceUnavailableException({
          message: error.message,
          reason: 'top_of_book_stale',
          ageMs: error.ageMs,
          maxAgeMs: error.maxAgeMs,
        });
      }
      throw error;
    }
  }
}
