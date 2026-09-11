import { Inject, Injectable } from '@nestjs/common';
import {
  PAPER_EXECUTION_REPOSITORY,
  PaperExecutionRepository,
} from '../domain/paper-execution-repository';
import { PaperPosition } from '../domain/paper-position';
import { calculatePaperPosition } from './paper-position-calculator';

@Injectable()
export class PaperPositionService {
  constructor(
    @Inject(PAPER_EXECUTION_REPOSITORY)
    private readonly repository: PaperExecutionRepository,
  ) {}

  async getPosition(): Promise<PaperPosition> {
    return calculatePaperPosition(await this.repository.listAllChronological());
  }
}
