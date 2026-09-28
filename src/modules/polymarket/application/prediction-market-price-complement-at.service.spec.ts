import { PredictionMarketDetails } from '../domain/prediction-market';
import { PredictionMarketOutcomeTokensUnavailableError } from '../domain/prediction-market-midpoint-complement';
import { PredictionMarketPriceComplementAtIncoherentError } from '../domain/prediction-market-price-complement-at';
import { PredictionMarketHistoricalPriceObservation } from '../domain/prediction-market-price-history';
import { PredictionMarketDiscoveryService } from './prediction-market-discovery.service';
import { PredictionMarketPriceComplementAtService } from './prediction-market-price-complement-at.service';
import { PredictionMarketPriceHistoryService } from './prediction-market-price-history.service';

describe('PredictionMarketPriceComplementAtService', () => {
  it.each([
    ['0.4', '0.6', '1', '0', 'balanced'],
    ['0.4', '0.5', '0.9', '-0.1', 'below_one'],
    ['0.7', '0.4', '1.1', '0.1', 'above_one'],
  ] as const)(
    'calculates exact point-in-time complement %s + %s',
    async (yesPrice, noPrice, sum, deviation, status) => {
      const service = createService(market(), (tokenId, at) =>
        Promise.resolve(
          historicalPrice(tokenId, tokenId === '111' ? yesPrice : noPrice, at),
        ),
      );

      await expect(
        service.getComplementAt('703257', requestedAt()),
      ).resolves.toMatchObject({
        priceSum: sum,
        deviationFromOne: deviation,
        status,
        sameObservedTimestamp: true,
        sameResolution: true,
        atomicSnapshot: false,
        executable: false,
      });
    },
  );

  it('preserves independently observed timestamps and resolutions', async () => {
    const service = createService(market(), (tokenId, at) =>
      Promise.resolve({
        ...historicalPrice(tokenId, '0.5', at),
        observedAt: new Date(
          tokenId === '111' ? '2026-09-27T00:05:00Z' : '2026-09-27T00:03:00Z',
        ),
        resolutionSeconds: tokenId === '111' ? 300 : 60,
      }),
    );

    await expect(
      service.getComplementAt('703257', requestedAt()),
    ).resolves.toMatchObject({
      sameObservedTimestamp: false,
      sameResolution: false,
    });
  });

  it('loads both outcome prices concurrently', async () => {
    const calls: string[] = [];
    let releaseYes: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseYes = resolve;
    });
    const service = createService(market(), async (tokenId, at) => {
      calls.push(tokenId);
      if (tokenId === '111') await gate;
      else releaseYes?.();
      return historicalPrice(tokenId, '0.5', at);
    });

    await service.getComplementAt('703257', requestedAt());
    expect(calls).toEqual(['111', '222']);
  });

  it('rejects missing or duplicate outcome token identities', async () => {
    const details = market();
    const missing = createService(
      {
        ...details,
        outcomes: {
          ...details.outcomes,
          yes: { ...details.outcomes.yes, tokenId: null },
        },
      },
      () => Promise.reject(new Error('unexpected price call')),
    );
    await expect(
      missing.getComplementAt('703257', requestedAt()),
    ).rejects.toBeInstanceOf(PredictionMarketOutcomeTokensUnavailableError);

    const duplicate = createService(
      {
        ...details,
        outcomes: {
          ...details.outcomes,
          no: { ...details.outcomes.no, tokenId: '111' },
        },
      },
      () => Promise.reject(new Error('unexpected price call')),
    );
    await expect(
      duplicate.getComplementAt('703257', requestedAt()),
    ).rejects.toBeInstanceOf(PredictionMarketPriceComplementAtIncoherentError);
  });

  it('rejects response identity or requested-time divergence', async () => {
    const service = createService(market(), (tokenId, at) =>
      Promise.resolve({
        ...historicalPrice(tokenId, '0.5', at),
        ...(tokenId === '111'
          ? { tokenId: '222' }
          : { requestedAt: new Date('2026-09-27T00:06:00Z') }),
      }),
    );
    await expect(
      service.getComplementAt('703257', requestedAt()),
    ).rejects.toBeInstanceOf(PredictionMarketPriceComplementAtIncoherentError);
  });
});

function createService(
  details: PredictionMarketDetails,
  getPriceAt: (
    tokenId: string,
    at: Date,
  ) => Promise<PredictionMarketHistoricalPriceObservation>,
): PredictionMarketPriceComplementAtService {
  return new PredictionMarketPriceComplementAtService(
    new PredictionMarketDiscoveryService({
      listActive: () => Promise.reject(new Error('unexpected list call')),
      getById: () => Promise.resolve(details),
      getTagsById: () => Promise.reject(new Error('unexpected tags call')),
    }),
    new PredictionMarketPriceHistoryService({
      getPriceHistory: () =>
        Promise.reject(new Error('unexpected history call')),
      getPriceAt,
    }),
  );
}

function requestedAt(): Date {
  return new Date('2026-09-27T00:07:00Z');
}

function market(): PredictionMarketDetails {
  return {
    provider: 'polymarket',
    id: '703257',
    slug: 'will-example-happen',
    question: 'Will the example happen?',
    conditionId: '0xcondition',
    outcomes: {
      yes: { label: 'Yes', tokenId: '111' },
      no: { label: 'No', tokenId: '222' },
    },
    receivedAt: new Date('2026-09-27T00:08:00Z'),
  };
}

function historicalPrice(
  tokenId: string,
  price: string,
  at: Date,
): PredictionMarketHistoricalPriceObservation {
  return {
    provider: 'polymarket',
    tokenId,
    requestedAt: at,
    observedAt: new Date('2026-09-27T00:05:00Z'),
    price,
    resolutionSeconds: 300,
    exactTimestamp: false,
    source: 'data-api-price-history',
    receivedAt: new Date('2026-09-28T10:00:00Z'),
    executable: false,
  };
}
