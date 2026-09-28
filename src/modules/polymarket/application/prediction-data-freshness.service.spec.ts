import { jest } from '@jest/globals';
import { PredictionDataFreshnessProvider } from '../domain/prediction-data-freshness';
import { PredictionDataFreshnessService } from './prediction-data-freshness.service';

describe('PredictionDataFreshnessService', () => {
  it('delegates the public Data API freshness observation', async () => {
    const result = freshnessObservation();
    const getFreshness = jest
      .fn<PredictionDataFreshnessProvider['getFreshness']>()
      .mockResolvedValue(result);
    const service = new PredictionDataFreshnessService({ getFreshness });

    await expect(service.getFreshness()).resolves.toBe(result);
    expect(getFreshness).toHaveBeenCalledWith(undefined);
  });
});

function freshnessObservation() {
  return {
    provider: 'polymarket' as const,
    snapshotAgeSeconds: 2,
    computedAt: '2026-09-27T22:00:00Z',
    ingestion: {
      chainId: 137,
      cursorCount: 2,
      lagging: [{ behindMax: 3, block: 100, source: 'orders' }],
      maxSyncedBlock: 103,
      minSyncedBlock: 100,
      mostLagged: { behindMax: 3, block: 100, source: 'orders' },
      network: 'polygon',
    },
    serving: {
      mechanisms: [{ ageSeconds: 4, name: 'activity_feed', blocksBehind: 1 }],
      lagSeconds: 4,
      worst: 'activity_feed',
    },
    source: 'data-api-status' as const,
    receivedAt: new Date('2026-09-27T22:00:02Z'),
  };
}
