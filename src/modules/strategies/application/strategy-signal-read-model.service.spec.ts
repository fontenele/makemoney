import { jest } from '@jest/globals';
import { StrategySignal } from '../domain/strategy';
import { StrategySignalRepository } from '../domain/strategy-signal-repository';
import { StrategySignalReadModelService } from './strategy-signal-read-model.service';

describe('StrategySignalReadModelService', () => {
  it('delegates persistence and reads to the repository', async () => {
    const value = signal();
    const save = jest.fn(() => Promise.resolve(value));
    const getLatest = jest.fn(() => Promise.resolve(value));
    const listRecent = jest.fn(() => Promise.resolve([value]));
    const repository: StrategySignalRepository = {
      save,
      getLatest,
      listRecent,
    };
    const service = new StrategySignalReadModelService(repository);

    await expect(service.record(value)).resolves.toBe(value);
    await expect(service.getLatest()).resolves.toBe(value);
    await expect(service.listRecent(25)).resolves.toEqual([value]);
    expect(save).toHaveBeenCalledWith(value);
    expect(listRecent).toHaveBeenCalledWith(25);
  });
});

function signal(): StrategySignal {
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
    latestCandleCloseTime: new Date('2026-09-12T12:00:59.999Z'),
    evaluatedAt: new Date('2026-09-12T12:01:00.100Z'),
  };
}
