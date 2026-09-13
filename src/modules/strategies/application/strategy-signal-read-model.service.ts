import { Inject, Injectable } from '@nestjs/common';
import { StrategySignal } from '../domain/strategy';
import {
  STRATEGY_SIGNAL_REPOSITORY,
  StrategySignalRepository,
} from '../domain/strategy-signal-repository';

export const DEFAULT_STRATEGY_SIGNAL_HISTORY_LIMIT = 50;
export const MAX_STRATEGY_SIGNAL_HISTORY_LIMIT = 100;

@Injectable()
export class StrategySignalReadModelService {
  constructor(
    @Inject(STRATEGY_SIGNAL_REPOSITORY)
    private readonly repository: StrategySignalRepository,
  ) {}

  record(signal: StrategySignal): Promise<StrategySignal> {
    return this.repository.save(signal);
  }

  getLatest(): Promise<StrategySignal | undefined> {
    return this.repository.getLatest();
  }

  listRecent(limit: number): Promise<StrategySignal[]> {
    return this.repository.listRecent(limit);
  }
}
