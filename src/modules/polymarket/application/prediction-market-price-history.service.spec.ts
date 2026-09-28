import { jest } from '@jest/globals';
import { PredictionMarketPriceHistoryProvider } from '../domain/prediction-market-price-history';
import { PredictionMarketPriceHistoryService } from './prediction-market-price-history.service';

describe('PredictionMarketPriceHistoryService', () => {
  it('delegates the bounded outcome price-history query', async () => {
    const query = {
      start: new Date('2026-09-27T00:00:00Z'),
      end: new Date('2026-09-28T00:00:00Z'),
      resolution: '5m' as const,
      limit: 100,
    };
    const result = {
      provider: 'polymarket' as const,
      tokenId: '111',
      ...query,
      points: [],
      nextCursor: null,
      source: 'data-api-price-history' as const,
      receivedAt: new Date('2026-09-28T08:00:00Z'),
      executable: false as const,
    };
    const getPriceHistory = jest
      .fn<PredictionMarketPriceHistoryProvider['getPriceHistory']>()
      .mockResolvedValue(result);
    const service = new PredictionMarketPriceHistoryService({
      getPriceHistory,
      getPriceAt: () => Promise.reject(new Error('unexpected price-at call')),
    });

    await expect(service.getPriceHistory('111', query)).resolves.toBe(result);
    expect(getPriceHistory).toHaveBeenCalledWith('111', query, undefined);
  });

  it('delegates the point-in-time outcome price query', async () => {
    const at = new Date('2026-09-27T00:07:00Z');
    const result = {
      provider: 'polymarket' as const,
      tokenId: '111',
      requestedAt: at,
      observedAt: new Date('2026-09-27T00:05:00Z'),
      price: '0.25',
      resolutionSeconds: 300,
      exactTimestamp: false,
      source: 'data-api-price-history' as const,
      receivedAt: new Date('2026-09-28T09:00:00Z'),
      executable: false as const,
    };
    const getPriceAt = jest
      .fn<PredictionMarketPriceHistoryProvider['getPriceAt']>()
      .mockResolvedValue(result);
    const service = new PredictionMarketPriceHistoryService({
      getPriceHistory: () =>
        Promise.reject(new Error('unexpected price-history call')),
      getPriceAt,
    });

    await expect(service.getPriceAt('111', at)).resolves.toBe(result);
    expect(getPriceAt).toHaveBeenCalledWith('111', at, undefined);
  });
});
