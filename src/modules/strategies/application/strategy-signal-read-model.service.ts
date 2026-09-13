import { Injectable } from '@nestjs/common';
import { StrategySignal } from '../domain/strategy';

export const DEFAULT_STRATEGY_SIGNAL_HISTORY_LIMIT = 50;
export const MAX_STRATEGY_SIGNAL_HISTORY_LIMIT = 100;

@Injectable()
export class StrategySignalReadModelService {
  private readonly signals: StrategySignal[] = [];

  record(signal: StrategySignal): void {
    this.signals.push(signal);
    if (this.signals.length > MAX_STRATEGY_SIGNAL_HISTORY_LIMIT) {
      this.signals.shift();
    }
  }

  getLatest(): StrategySignal | undefined {
    return this.signals.at(-1);
  }

  listRecent(limit: number): StrategySignal[] {
    return this.signals.slice(-limit).reverse();
  }
}
