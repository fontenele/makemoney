import { jest } from '@jest/globals';
import { PredictionSearchProvider } from '../domain/prediction-search';
import { PredictionSearchService } from './prediction-search.service';

describe('PredictionSearchService', () => {
  it('delegates a bounded active-event search', async () => {
    const result = {
      query: 'bitcoin',
      page: 3,
      events: [],
      hasMore: false,
      totalResults: 0,
      receivedAt: new Date('2026-09-29T23:00:00.000Z'),
    };
    const searchActiveEvents = jest
      .fn<PredictionSearchProvider['searchActiveEvents']>()
      .mockResolvedValue(result);
    const service = new PredictionSearchService({ searchActiveEvents });

    await expect(
      service.searchActiveEvents({ query: 'bitcoin', limit: 8, page: 3 }),
    ).resolves.toBe(result);
    expect(searchActiveEvents).toHaveBeenCalledWith(
      { query: 'bitcoin', limit: 8, page: 3 },
      undefined,
    );
  });
});
