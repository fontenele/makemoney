import { ServiceUnavailableException } from '@nestjs/common';
import { LatestStrategySignalService } from '../application/latest-strategy-signal.service';
import { StrategySignal } from '../domain/strategy';
import { StrategiesController } from './strategies.controller';

describe('StrategiesController', () => {
  it('returns service unavailable before a live signal exists', () => {
    const controller = new StrategiesController(
      new LatestStrategySignalService(),
    );

    expect(() => controller.getLatestSignal()).toThrow(
      ServiceUnavailableException,
    );
  });

  it('returns the latest live signal', () => {
    const latest = new LatestStrategySignalService();
    const value = signal();
    latest.update(value);
    const controller = new StrategiesController(latest);

    expect(controller.getLatestSignal()).toBe(value);
  });
});

function signal(): StrategySignal {
  return {
    strategy: 'moving_average_crossover',
    symbol: 'BTC/USDT',
    action: 'buy',
    reason: 'bullish_moving_average_crossover',
    shortPeriod: 3,
    longPeriod: 5,
    previousShortAverage: '9',
    previousLongAverage: '10',
    currentShortAverage: '11',
    currentLongAverage: '10',
    latestCandleCloseTime: new Date('2026-09-12T12:00:59.999Z'),
    evaluatedAt: new Date('2026-09-12T12:01:00.100Z'),
  };
}
