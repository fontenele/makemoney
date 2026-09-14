import { jest } from '@jest/globals';
import { DetectedSpotSymbol } from '../domain/spot-symbol-catalog';
import { NewListingsController } from './new-listings.controller';

describe('NewListingsController', () => {
  it('uses the default or requested bounded limit', async () => {
    const listRecent = jest.fn((limit: number) =>
      Promise.resolve(limit > 0 ? [detection()] : []),
    );
    const controller = new NewListingsController({ listRecent });

    await expect(controller.list()).resolves.toHaveLength(1);
    expect(listRecent).toHaveBeenLastCalledWith(50);
    await expect(controller.list('1')).resolves.toHaveLength(1);
    expect(listRecent).toHaveBeenLastCalledWith(1);
  });

  it.each(['0', '-1', '1.5', 'abc', '101'])(
    'rejects invalid limit %s',
    (limit) => {
      const controller = new NewListingsController({
        listRecent: jest.fn(() => Promise.resolve([])),
      });
      expect(() => controller.list(limit)).toThrow(
        'limit must be an integer from 1 to 100',
      );
    },
  );
});

function detection(): DetectedSpotSymbol {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    baseAsset: 'NEW',
    quoteAsset: 'USDT',
    status: 'TRADING',
    spotTradingAllowed: true,
    detectedAt: new Date('2026-09-14T02:00:00.000Z'),
    lastObservedAt: new Date('2026-09-14T03:00:00.000Z'),
  };
}
