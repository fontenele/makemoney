import { StrategySignal } from './strategy';

export const STRATEGY_SIGNAL_REPOSITORY = Symbol('STRATEGY_SIGNAL_REPOSITORY');

export interface StrategySignalRepository {
  save(signal: StrategySignal): Promise<StrategySignal>;
  getLatest(): Promise<StrategySignal | undefined>;
  listRecent(limit: number): Promise<StrategySignal[]>;
}
