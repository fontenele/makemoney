import { PredictionMarketDetails } from '../domain/prediction-market';
import { PredictionMarketBinaryPriceChangeIncoherentError } from '../domain/prediction-market-binary-price-change';
import { PredictionMarketOutcomeTokensUnavailableError } from '../domain/prediction-market-midpoint-complement';
import { PredictionMarketPriceChange } from '../domain/prediction-market-price-change';
import { PredictionMarketDiscoveryService } from './prediction-market-discovery.service';
import { PredictionMarketBinaryPriceChangeService } from './prediction-market-binary-price-change.service';
import { PredictionMarketPriceChangeService } from './prediction-market-price-change.service';
import { PredictionMarketPriceHistoryService } from './prediction-market-price-history.service';

describe('PredictionMarketBinaryPriceChangeService', () => {
  it.each([
    ['0.1', '-0.1', '0', 'unchanged'],
    ['0.1', '-0.05', '0.05', 'up'],
    ['0.05', '-0.1', '-0.05', 'down'],
  ] as const)(
    'calculates combined binary change %s + %s',
    async (yesChange, noChange, combinedPriceChange, combinedDirection) => {
      const service = createService(market(), (tokenId) =>
        Promise.resolve(
          change(tokenId, tokenId === '111' ? yesChange : noChange),
        ),
      );

      await expect(
        service.getPriceChange('703257', requestedFrom(), requestedTo()),
      ).resolves.toMatchObject({
        combinedPriceChange,
        combinedDirection,
        sameFromObservedTimestamp: true,
        sameToObservedTimestamp: true,
        sameFromResolution: true,
        sameToResolution: true,
        atomicSnapshot: false,
        executable: false,
      });
    },
  );

  it('preserves independent cross-outcome timestamps and resolutions', async () => {
    const service = createService(market(), (tokenId) => {
      const result = change(tokenId, '0');
      if (tokenId === '222') {
        result.observations.from.observedAt = new Date('2026-09-27T00:02:00Z');
        result.observations.to.observedAt = new Date('2026-09-27T00:05:00Z');
        result.observations.from.resolutionSeconds = 300;
        result.observations.to.resolutionSeconds = 300;
      }
      return Promise.resolve(result);
    });

    await expect(
      service.getPriceChange('703257', requestedFrom(), requestedTo()),
    ).resolves.toMatchObject({
      sameFromObservedTimestamp: false,
      sameToObservedTimestamp: false,
      sameFromResolution: false,
      sameToResolution: false,
    });
  });

  it('loads both outcome changes concurrently', async () => {
    const calls: string[] = [];
    let releaseYes: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      releaseYes = resolve;
    });
    const service = createService(market(), async (tokenId) => {
      calls.push(tokenId);
      if (tokenId === '111') await gate;
      else releaseYes?.();
      return change(tokenId, '0');
    });

    await service.getPriceChange('703257', requestedFrom(), requestedTo());
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
      () => Promise.reject(new Error('unexpected price-change call')),
    );
    await expect(
      missing.getPriceChange('703257', requestedFrom(), requestedTo()),
    ).rejects.toBeInstanceOf(PredictionMarketOutcomeTokensUnavailableError);

    const duplicate = createService(
      {
        ...details,
        outcomes: {
          ...details.outcomes,
          no: { ...details.outcomes.no, tokenId: '111' },
        },
      },
      () => Promise.reject(new Error('unexpected price-change call')),
    );
    await expect(
      duplicate.getPriceChange('703257', requestedFrom(), requestedTo()),
    ).rejects.toBeInstanceOf(PredictionMarketBinaryPriceChangeIncoherentError);
  });

  it.each(['token', 'from', 'to'])(
    'rejects %s response divergence',
    async (divergence) => {
      const service = createService(market(), (tokenId) => {
        const result = change(tokenId, '0');
        if (tokenId === '111') {
          if (divergence === 'token') result.tokenId = '222';
          if (divergence === 'from') result.requestedFrom = requestedTo();
          if (divergence === 'to') result.requestedTo = requestedFrom();
        }
        return Promise.resolve(result);
      });

      await expect(
        service.getPriceChange('703257', requestedFrom(), requestedTo()),
      ).rejects.toBeInstanceOf(
        PredictionMarketBinaryPriceChangeIncoherentError,
      );
    },
  );
});

function createService(
  details: PredictionMarketDetails,
  getPriceChange: (tokenId: string) => Promise<PredictionMarketPriceChange>,
): PredictionMarketBinaryPriceChangeService {
  const discovery = new PredictionMarketDiscoveryService({
    listActive: () => Promise.reject(new Error('unexpected list call')),
    getById: () => Promise.resolve(details),
    getTagsById: () => Promise.reject(new Error('unexpected tags call')),
  });
  const unexpectedHistory = new PredictionMarketPriceHistoryService({
    getPriceHistory: () => Promise.reject(new Error('unexpected history call')),
    getPriceAt: () => Promise.reject(new Error('unexpected price-at call')),
  });
  const priceChange = new PredictionMarketPriceChangeService(unexpectedHistory);
  priceChange.getPriceChange = (tokenId) => getPriceChange(tokenId);
  return new PredictionMarketBinaryPriceChangeService(discovery, priceChange);
}

function requestedFrom(): Date {
  return new Date('2026-09-27T00:05:00Z');
}

function requestedTo(): Date {
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

function change(
  tokenId: string,
  priceChange: string,
): PredictionMarketPriceChange {
  return {
    provider: 'polymarket',
    tokenId,
    requestedFrom: requestedFrom(),
    requestedTo: requestedTo(),
    observations: {
      from: {
        provider: 'polymarket',
        tokenId,
        requestedAt: requestedFrom(),
        observedAt: new Date('2026-09-27T00:03:00Z'),
        price: '0.4',
        resolutionSeconds: 60,
        exactTimestamp: false,
        source: 'data-api-price-history',
        receivedAt: new Date('2026-09-28T10:00:00Z'),
        executable: false,
      },
      to: {
        provider: 'polymarket',
        tokenId,
        requestedAt: requestedTo(),
        observedAt: new Date('2026-09-27T00:06:00Z'),
        price: '0.5',
        resolutionSeconds: 60,
        exactTimestamp: false,
        source: 'data-api-price-history',
        receivedAt: new Date('2026-09-28T10:00:01Z'),
        executable: false,
      },
    },
    priceChange,
    direction: directionOf(priceChange),
    sameObservedTimestamp: false,
    sameResolution: true,
    executable: false,
  };
}

function directionOf(
  priceChange: string,
): PredictionMarketPriceChange['direction'] {
  if (priceChange === '0') return 'unchanged';
  return priceChange.startsWith('-') ? 'down' : 'up';
}
