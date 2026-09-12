import { Inject, Injectable } from '@nestjs/common';
import {
  PAPER_EXECUTION_REPOSITORY,
  PaperExecutionRepository,
} from '../domain/paper-execution-repository';
import { PaperTradingPerformance } from '../domain/paper-trading-performance';
import { calculatePaperTradingPerformance } from './paper-trading-performance-calculator';

@Injectable()
export class PaperTradingPerformanceService {
  constructor(
    @Inject(PAPER_EXECUTION_REPOSITORY)
    private readonly repository: PaperExecutionRepository,
  ) {}

  async getPerformance(): Promise<PaperTradingPerformance> {
    return calculatePaperTradingPerformance(
      await this.repository.listAllChronological(),
    );
  }
}
