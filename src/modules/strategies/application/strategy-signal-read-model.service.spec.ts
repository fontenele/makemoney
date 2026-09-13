import { StrategySignal } from '../domain/strategy';
import {
  MAX_STRATEGY_SIGNAL_HISTORY_LIMIT,
  StrategySignalReadModelService,
} from './strategy-signal-read-model.service';

describe('StrategySignalReadModelService', () => {
  it('starts without a latest signal or history', () => {
    const service = new StrategySignalReadModelService();

    expect(service.getLatest()).toBeUndefined();
    expect(service.listRecent(50)).toEqual([]);
  });

  it('returns the latest signal and recent history newest first', () => {
    const service = new StrategySignalReadModelService();
    const first = signal(1);
    const second = signal(2);
    const latest = signal(3);
    service.record(first);
    service.record(second);
    service.record(latest);

    expect(service.getLatest()).toBe(latest);
    expect(service.listRecent(2)).toEqual([latest, second]);
  });

  it('discards the oldest signals beyond the fixed capacity', () => {
    const service = new StrategySignalReadModelService();
    for (
      let index = 0;
      index <= MAX_STRATEGY_SIGNAL_HISTORY_LIMIT;
      index += 1
    ) {
      service.record(signal(index));
    }

    const history = service.listRecent(MAX_STRATEGY_SIGNAL_HISTORY_LIMIT);
    expect(history).toHaveLength(MAX_STRATEGY_SIGNAL_HISTORY_LIMIT);
    expect(history.at(-1)?.evaluatedAt).toEqual(signal(1).evaluatedAt);
  });
});

function signal(index: number): StrategySignal {
  const evaluatedAt = new Date(Date.UTC(2026, 8, 12, 12, index));
  return {
    strategy: 'moving_average_crossover',
    symbol: 'BTC/USDT',
    action: 'hold',
    reason: 'no_moving_average_crossover',
    shortPeriod: 3,
    longPeriod: 5,
    previousShortAverage: '100',
    previousLongAverage: '100',
    currentShortAverage: '100',
    currentLongAverage: '100',
    latestCandleCloseTime: new Date(evaluatedAt.getTime() - 1),
    evaluatedAt,
  };
}
