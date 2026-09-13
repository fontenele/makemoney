import { StrategySignal } from '../../strategies/domain/strategy';

export interface BacktestResult {
  symbol: 'BTC/USDT';
  interval: '1m';
  candleCount: number;
  startedAt: Date | null;
  endedAt: Date | null;
  signalCount: number;
  buySignalCount: number;
  sellSignalCount: number;
  holdSignalCount: number;
  signals: StrategySignal[];
}
