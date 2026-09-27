import { jest } from '@jest/globals';
import { PredictionMarketProvider } from '../domain/prediction-market';
import { PredictionMarketDiscoveryService } from './prediction-market-discovery.service';

describe('PredictionMarketDiscoveryService', () => {
  it('delegates selected-market tag lookup', async () => {
    const result = {
      provider: 'polymarket' as const,
      marketId: '703257',
      tags: [{ id: '2', label: 'Politics', slug: 'politics' }],
      receivedAt: new Date('2026-09-27T20:00:00.000Z'),
    };
    const getTagsById = jest
      .fn<PredictionMarketProvider['getTagsById']>()
      .mockResolvedValue(result);
    const service = new PredictionMarketDiscoveryService({
      listActive: () => Promise.reject(new Error('unexpected list call')),
      getById: () => Promise.reject(new Error('unexpected detail call')),
      getTagsById,
    });

    await expect(service.getTagsById('703257')).resolves.toBe(result);
    expect(getTagsById).toHaveBeenCalledWith('703257', undefined);
  });
});
