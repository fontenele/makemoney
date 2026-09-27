import {
  PredictionMarketDataIncoherentError,
  PredictionMarketDataObservation,
} from '../domain/prediction-market-data-observation';
import type { PredictionMarketOutcomeMidpoint } from '../domain/prediction-market-midpoint';
import type { PredictionMarketTopOfBook } from '../domain/prediction-market-top-of-book';
import { PredictionMarketDataObservationService } from './prediction-market-data-observation.service';
import { PredictionMarketOrderBookService } from './prediction-market-order-book.service';
import { PredictionMarketPricingService } from './prediction-market-pricing.service';

describe('PredictionMarketDataObservationService', () => {
  it('loads both public observations concurrently and verifies their exact midpoint', async () => {
    const calls: string[] = [];
    let releaseMidpoint: (() => void) | undefined;
    const midpointGate = new Promise<void>((resolve) => {
      releaseMidpoint = resolve;
    });
    const service = createService(
      async () => {
        calls.push('midpoint-started');
        await midpointGate;
        return midpoint();
      },
      () => {
        calls.push('book-started');
        releaseMidpoint?.();
        return Promise.resolve(topOfBook());
      },
    );

    await expect(service.getObservation('111')).resolves.toMatchObject<
      Partial<PredictionMarketDataObservation>
    >({
      provider: 'polymarket',
      tokenId: '111',
      coherence: {
        status: 'verified',
        bookMidpoint: '0.45',
        reason: null,
      },
      executable: false,
    });
    expect(calls).toEqual(['midpoint-started', 'book-started']);
  });

  it.each([
    [null, null, 'missing_bid_and_ask'],
    [null, { price: '0.46', quantity: '150' }, 'missing_bid'],
    [{ price: '0.44', quantity: '100' }, null, 'missing_ask'],
  ] as const)(
    'marks missing book liquidity as unverifiable',
    async (bid, ask, reason) => {
      const service = createService(
        () => Promise.resolve(midpoint()),
        () => Promise.resolve({ ...topOfBook(), bid, ask, spread: null }),
      );

      await expect(service.getObservation('111')).resolves.toMatchObject({
        coherence: { status: 'unverifiable', bookMidpoint: null, reason },
        executable: false,
      });
    },
  );

  it('rejects independently loaded observations with different midpoints', async () => {
    const service = createService(
      () => Promise.resolve({ ...midpoint(), price: '0.46' }),
      () => Promise.resolve(topOfBook()),
    );

    await expect(service.getObservation('111')).rejects.toMatchObject({
      name: PredictionMarketDataIncoherentError.name,
      tokenId: '111',
      providerMidpoint: '0.46',
      bookMidpoint: '0.45',
      reason: 'midpoint_mismatch',
    });
  });

  it('rejects a provider identity mismatch', async () => {
    const service = createService(
      () => Promise.resolve({ ...midpoint(), tokenId: '222' }),
      () => Promise.resolve(topOfBook()),
    );

    await expect(service.getObservation('111')).rejects.toMatchObject({
      name: PredictionMarketDataIncoherentError.name,
      tokenId: '111',
      providerMidpoint: '0.4500',
      bookMidpoint: null,
      reason: 'identity_mismatch',
    });
  });
});

function createService(
  getMidpoint: () => Promise<PredictionMarketOutcomeMidpoint>,
  getTopOfBook: () => Promise<PredictionMarketTopOfBook>,
): PredictionMarketDataObservationService {
  return new PredictionMarketDataObservationService(
    new PredictionMarketPricingService({ getMidpoint }),
    new PredictionMarketOrderBookService({ getTopOfBook }),
  );
}

function midpoint(): PredictionMarketOutcomeMidpoint {
  return {
    provider: 'polymarket',
    tokenId: '111',
    price: '0.4500',
    source: 'clob-midpoint',
    executable: false,
    providerTimestamp: null,
    receivedAt: new Date('2026-09-26T18:00:00.000Z'),
  };
}

function topOfBook(): PredictionMarketTopOfBook {
  return {
    provider: 'polymarket',
    tokenId: '111',
    conditionId: '0xcondition',
    snapshotHash: '0xhash',
    bid: { price: '0.44', quantity: '100' },
    ask: { price: '0.46', quantity: '150' },
    spread: '0.02',
    source: 'clob-order-book',
    executable: false,
    providerTimestamp: '1758920000123',
    receivedAt: new Date('2026-09-26T18:00:00.010Z'),
  };
}
