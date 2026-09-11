import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  DEFAULT_EXECUTION_HISTORY_LIMIT,
  MAX_EXECUTION_HISTORY_LIMIT,
  PaperExecutionHistoryService,
} from '../application/paper-execution-history.service';
import { PaperExecution } from '../domain/trading-executor';
import { PaperPositionService } from '../application/paper-position.service';
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
  getPosition(): Promise<PaperPosition> {
    return this.position.getPosition();
  }
}
