import { ServiceUnavailableException } from '@nestjs/common';
import { StrategySignalReadModelService } from '../application/strategy-signal-read-model.service';
import { StrategySignal } from '../domain/strategy';
import { StrategySignalRepository } from '../domain/strategy-signal-repository';
import { StrategiesController } from './strategies.controller';

describe('StrategiesController', () => {
  it('returns service unavailable before a persisted signal exists', async () => {
    const controller = new StrategiesController(createSignalReadModel());

    await expect(controller.getLatestSignal()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('returns the latest persisted signal', async () => {
    const latest = createSignalReadModel();
    const value = signal();
    await latest.record(value);
    const controller = new StrategiesController(latest);

    await expect(controller.getLatestSignal()).resolves.toBe(value);
  });

  it('returns recent signals using the default or requested limit', async () => {
    const signals = createSignalReadModel();
    for (let index = 0; index < 51; index += 1) {
      await signals.record(signal(index));
    }
    const controller = new StrategiesController(signals);

    const defaultHistory = await controller.listSignals();
    expect(defaultHistory).toHaveLength(50);
    expect(defaultHistory.at(-1)?.evaluatedAt).toEqual(signal(1).evaluatedAt);
    await expect(controller.listSignals('1')).resolves.toEqual([signal(50)]);
    await expect(controller.listSignals('100')).resolves.toHaveLength(51);
  });

  it.each(['0', '-1', '1.5', 'abc', '101'])(
    'rejects invalid history limit %s',
    (limit) => {
      const controller = new StrategiesController(createSignalReadModel());

      expect(() => controller.listSignals(limit)).toThrow(
        'limit must be an integer from 1 to 100',
      );
    },
  );
});

function createSignalReadModel(): StrategySignalReadModelService {
  const values: StrategySignal[] = [];
  const repository: StrategySignalRepository = {
    save: (value) => {
      values.push(value);
      return Promise.resolve(value);
    },
    getLatest: () => Promise.resolve(values.at(-1)),
    listRecent: (limit) => Promise.resolve(values.slice(-limit).reverse()),
  };
  return new StrategySignalReadModelService(repository);
}

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
