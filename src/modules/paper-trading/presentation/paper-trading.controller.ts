import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  DEFAULT_EXECUTION_HISTORY_LIMIT,
  MAX_EXECUTION_HISTORY_LIMIT,
  PaperExecutionHistoryService,
} from '../application/paper-execution-history.service';
import { PaperExecution } from '../domain/trading-executor';

@Controller('paper-trading')
export class PaperTradingController {
  constructor(private readonly history: PaperExecutionHistoryService) {}

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
}
