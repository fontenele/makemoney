import { StrategySignal } from '../domain/strategy';
import { LatestStrategySignalService } from './latest-strategy-signal.service';

describe('LatestStrategySignalService', () => {
  it('has no signal before the first live evaluation', () => {
    expect(new LatestStrategySignalService().getLatest()).toBeUndefined();
  });

  it('retains the most recently generated signal', () => {
    const service = new LatestStrategySignalService();
    const first = signal('hold');
    const latest = signal('buy');

    service.update(first);
    service.update(latest);

    expect(service.getLatest()).toBe(latest);
  });
});

function signal(action: 'buy' | 'hold'): StrategySignal {
  return {
    strategy: 'moving_average_crossover',
    symbol: 'BTC/USDT',
    action,
    reason:
      action === 'buy'
        ? 'bullish_moving_average_crossover'
        : 'insufficient_closed_candles',
    shortPeriod: 3,
    longPeriod: 5,
    previousShortAverage: null,
    previousLongAverage: null,
    currentShortAverage: null,
    currentLongAverage: null,
    latestCandleCloseTime: new Date('2026-09-12T12:00:59.999Z'),
    evaluatedAt: new Date('2026-09-12T12:01:00.100Z'),
  };
}
