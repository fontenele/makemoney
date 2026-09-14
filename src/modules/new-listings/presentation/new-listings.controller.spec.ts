import { jest } from '@jest/globals';
import { DetectedSpotSymbol } from '../domain/spot-symbol-catalog';
import { NewListingsController } from './new-listings.controller';

describe('NewListingsController', () => {
  it('uses the default or requested bounded limit', async () => {
    const listRecent = jest.fn((query: { limit: number }) =>
      Promise.resolve(query.limit > 0 ? [detection()] : []),
    );
    const controller = new NewListingsController({ listRecent });

    await expect(controller.list()).resolves.toHaveLength(1);
    expect(listRecent).toHaveBeenLastCalledWith({
      limit: 50,
      detectedFrom: undefined,
      detectedTo: undefined,
    });
    await expect(controller.list('1')).resolves.toHaveLength(1);
    expect(listRecent).toHaveBeenLastCalledWith({
      limit: 1,
      detectedFrom: undefined,
      detectedTo: undefined,
    });
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

  it('accepts inclusive canonical UTC detection bounds', async () => {
    const listRecent = jest.fn(() => Promise.resolve([detection()]));
    const controller = new NewListingsController({ listRecent });

    await controller.list(
      '10',
      '2026-09-14T02:00:00.000Z',
      '2026-09-14T03:00:00.000Z',
    );
    expect(listRecent).toHaveBeenCalledWith({
      limit: 10,
      detectedFrom: new Date('2026-09-14T02:00:00.000Z'),
      detectedTo: new Date('2026-09-14T03:00:00.000Z'),
    });
  });

  it.each([
    ['detectedFrom', '2026-09-14'],
    ['detectedTo', '2026-09-14T02:00:00Z'],
  ])('rejects invalid %s', (field, value) => {
    const controller = new NewListingsController({
      listRecent: jest.fn(() => Promise.resolve([])),
    });
    expect(() =>
      controller.list(
        undefined,
        field === 'detectedFrom' ? value : undefined,
        field === 'detectedTo' ? value : undefined,
      ),
    ).toThrow(`${field} must be an ISO 8601 UTC timestamp`);
  });

  it('rejects an inverted detection range', () => {
    const controller = new NewListingsController({
      listRecent: jest.fn(() => Promise.resolve([])),
    });
    expect(() =>
      controller.list(
        undefined,
        '2026-09-14T03:00:00.000Z',
        '2026-09-14T02:00:00.000Z',
      ),
    ).toThrow('detectedFrom must be at or before detectedTo');
  });
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
