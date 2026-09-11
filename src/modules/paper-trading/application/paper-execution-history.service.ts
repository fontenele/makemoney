import { Inject, Injectable } from '@nestjs/common';
import {
  PAPER_EXECUTION_REPOSITORY,
  PaperExecutionRepository,
} from '../domain/paper-execution-repository';
import { PaperExecution } from '../domain/trading-executor';

export const DEFAULT_EXECUTION_HISTORY_LIMIT = 50;
export const MAX_EXECUTION_HISTORY_LIMIT = 100;

@Injectable()
export class PaperExecutionHistoryService {
  constructor(
    @Inject(PAPER_EXECUTION_REPOSITORY)
    private readonly repository: PaperExecutionRepository,
  ) {}

  listRecent(
    limit = DEFAULT_EXECUTION_HISTORY_LIMIT,
  ): Promise<PaperExecution[]> {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > MAX_EXECUTION_HISTORY_LIMIT
    ) {
      throw new RangeError(
        `Execution history limit must be an integer from 1 to ${MAX_EXECUTION_HISTORY_LIMIT}`,
      );
    }
    return this.repository.listRecent(limit);
  }
}
