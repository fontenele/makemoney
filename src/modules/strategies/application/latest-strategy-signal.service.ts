import { Injectable } from '@nestjs/common';
import { StrategySignal } from '../domain/strategy';

@Injectable()
export class LatestStrategySignalService {
  private latestSignal: StrategySignal | undefined;

  update(signal: StrategySignal): void {
    this.latestSignal = signal;
  }

  getLatest(): StrategySignal | undefined {
    return this.latestSignal;
  }
}
