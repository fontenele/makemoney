import { jest } from '@jest/globals';
import { ListingMarketObservation } from '../domain/listing-market-observation';
import { ListingTopOfBookObservation } from '../domain/listing-top-of-book-observation';
import { ListingTopOfBookSnapshotService } from './listing-top-of-book-snapshot.service';
import { ClaimedListingObservationCheckpoint } from '../domain/listing-observation-schedule';
import { ProviderListingObservationCheckpointProcessor } from './provider-listing-observation-checkpoint.processor';

describe('ProviderListingObservationCheckpointProcessor', () => {
  it('loads the market and top-of-book snapshots for the claimed identity', async () => {
    const observation = sampleObservation();
    const topOfBook = sampleTopOfBook();
    const load = jest.fn(() => Promise.resolve(observation));
    const loadTopOfBook = jest.fn(() => Promise.resolve(topOfBook));
    const processor = new ProviderListingObservationCheckpointProcessor(
      { load },
      { load: loadTopOfBook } as unknown as ListingTopOfBookSnapshotService,
    );

    await expect(processor.process(checkpoint())).resolves.toEqual({
      observation,
      topOfBook,
    });
    expect(load).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledWith({
      provider: 'binance',
      symbol: 'NEWUSDT',
    });
    expect(loadTopOfBook).toHaveBeenCalledWith({
      provider: 'binance',
      symbol: 'NEWUSDT',
    });
  });

  it('propagates provider failures for cycle-level isolation and lease recovery', async () => {
    const failure = new Error('provider unavailable');
    const processor = new ProviderListingObservationCheckpointProcessor(
      { load: jest.fn(() => Promise.reject(failure)) },
      {
        load: jest.fn(() => Promise.resolve(sampleTopOfBook())),
      } as unknown as ListingTopOfBookSnapshotService,
    );

    await expect(processor.process(checkpoint())).rejects.toBe(failure);
  });

  it('propagates top-of-book failures without producing a partial result', async () => {
    const failure = new Error('top-of-book unavailable');
    const processor = new ProviderListingObservationCheckpointProcessor(
      { load: jest.fn(() => Promise.resolve(sampleObservation())) },
      {
        load: jest.fn(() => Promise.reject(failure)),
      } as unknown as ListingTopOfBookSnapshotService,
    );

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

function sampleTopOfBook(): ListingTopOfBookObservation {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    updateId: '123456',
    bidPrice: '0.00000999',
    bidQuantity: '10000.00000000',
    askPrice: '0.00001001',
    askQuantity: '12000.00000000',
    receivedAt: new Date('2026-09-19T12:00:06.200Z'),
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
