import { ServiceUnavailableException } from '@nestjs/common';
import { StrategySignalReadModelService } from '../application/strategy-signal-read-model.service';
import { StrategySignal } from '../domain/strategy';
import { StrategiesController } from './strategies.controller';

describe('StrategiesController', () => {
  it('returns service unavailable before a live signal exists', () => {
    const controller = new StrategiesController(
      new StrategySignalReadModelService(),
    );

    expect(() => controller.getLatestSignal()).toThrow(
      ServiceUnavailableException,
    );
  });

  it('returns the latest live signal', () => {
    const latest = new StrategySignalReadModelService();
    const value = signal();
    latest.record(value);
    const controller = new StrategiesController(latest);

    expect(controller.getLatestSignal()).toBe(value);
  });

  it('returns recent signals using the default or requested limit', () => {
    const signals = new StrategySignalReadModelService();
    for (let index = 0; index < 51; index += 1) {
      signals.record(signal(index));
    }
    const controller = new StrategiesController(signals);

    expect(controller.listSignals()).toHaveLength(50);
    expect(controller.listSignals().at(-1)?.evaluatedAt).toEqual(
      signal(1).evaluatedAt,
    );
    expect(controller.listSignals('1')).toEqual([signal(50)]);
    expect(controller.listSignals('100')).toHaveLength(51);
  });

  it.each(['0', '-1', '1.5', 'abc', '101'])(
    'rejects invalid history limit %s',
    (limit) => {
      const controller = new StrategiesController(
        new StrategySignalReadModelService(),
      );

      expect(() => controller.listSignals(limit)).toThrow(
        'limit must be an integer from 1 to 100',
      );
    },
  );
});

function signal(index = 0): StrategySignal {
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
    latestCandleCloseTime: new Date(
      Date.parse('2026-09-12T12:00:59.999Z') + index,
    ),
    evaluatedAt: new Date(Date.parse('2026-09-12T12:01:00.100Z') + index),
  };
}
