import { jest } from '@jest/globals';
import { ListingMarketObservation } from '../domain/listing-market-observation';
import { ClaimedListingObservationCheckpoint } from '../domain/listing-observation-schedule';
import { ProviderListingObservationCheckpointProcessor } from './provider-listing-observation-checkpoint.processor';

describe('ProviderListingObservationCheckpointProcessor', () => {
  it('loads the claimed provider and symbol and returns its observation', async () => {
    const observation = sampleObservation();
    const load = jest.fn(() => Promise.resolve(observation));
    const processor = new ProviderListingObservationCheckpointProcessor({
      load,
    });

    await expect(processor.process(checkpoint())).resolves.toBe(observation);
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith({
      provider: 'binance',
      symbol: 'NEWUSDT',
    });
  });

  it('propagates provider failures for cycle-level isolation and lease recovery', async () => {
    const failure = new Error('provider unavailable');
    const processor = new ProviderListingObservationCheckpointProcessor({
      load: jest.fn(() => Promise.reject(failure)),
    });

    await expect(processor.process(checkpoint())).rejects.toBe(failure);
  });
});

function checkpoint(): ClaimedListingObservationCheckpoint {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    label: 'T+5s',
    offsetMs: 5_000,
    targetAt: new Date('2026-09-19T12:00:05.000Z'),
    claimToken: 'worker-1',
    claimedAt: new Date('2026-09-19T12:00:06.000Z'),
    claimExpiresAt: new Date('2026-09-19T12:00:36.000Z'),
  };
}

function sampleObservation(): ListingMarketObservation {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    lastPrice: '0.00001000',
    baseVolume: '1200000.50000000',
    quoteVolume: '12.34567890',
    tradeCount: 42,
    windowOpenTime: new Date('2026-09-18T12:00:06.000Z'),
    windowCloseTime: new Date('2026-09-19T12:00:06.000Z'),
    receivedAt: new Date('2026-09-19T12:00:06.100Z'),
  };
}
