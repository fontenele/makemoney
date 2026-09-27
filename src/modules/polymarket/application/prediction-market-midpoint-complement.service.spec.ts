import {
  PredictionMarketMidpointComplementIncoherentError,
  PredictionMarketOutcomeTokensUnavailableError,
} from '../domain/prediction-market-midpoint-complement';
import type { PredictionMarketOutcomeMidpoint } from '../domain/prediction-market-midpoint';
import type { PredictionMarketDetails } from '../domain/prediction-market';
import { PredictionMarketDiscoveryService } from './prediction-market-discovery.service';
import { PredictionMarketMidpointComplementService } from './prediction-market-midpoint-complement.service';
import { PredictionMarketPricingService } from './prediction-market-pricing.service';

describe('PredictionMarketMidpointComplementService', () => {
  it.each([
    ['0.4', '0.6', '1', '0', 'balanced'],
    ['0.4', '0.59', '0.99', '-0.01', 'below_one'],
    ['0.41', '0.6', '1.01', '0.01', 'above_one'],
  ] as const)(
    'classifies exact midpoint sum %s + %s as %s',
    async (yesPrice, noPrice, sum, deviation, status) => {
      const service = createService(market(), (tokenId) =>
        Promise.resolve(
          midpoint(tokenId, tokenId === '111' ? yesPrice : noPrice),
        ),
      );

      await expect(service.getComplement('703257')).resolves.toMatchObject({
        midpointSum: sum,
        deviationFromOne: deviation,
        status,
        atomicSnapshot: false,
        executable: false,
      });
    },
  );

  it('loads YES and NO midpoints concurrently after market discovery', async () => {
    const calls: string[] = [];
    let releaseYes: (() => void) | undefined;
    const yesGate = new Promise<void>((resolve) => {
      releaseYes = resolve;
    });
    const service = createService(market(), async (tokenId) => {
      calls.push(tokenId);
      if (tokenId === '111') await yesGate;
      else releaseYes?.();
      return midpoint(tokenId, tokenId === '111' ? '0.4' : '0.6');
    });

    await service.getComplement('703257');
    expect(calls).toEqual(['111', '222']);
  });

  it.each([
    [{ yes: { label: 'Yes', tokenId: null } }, 'missing YES'],
    [{ no: { label: 'No', tokenId: null } }, 'missing NO'],
  ] as const)('rejects a market with %s token', async (outcomes) => {
    const details = market();
    const service = createService(
      {
        ...details,
        outcomes: { ...details.outcomes, ...outcomes },
      },
      () => Promise.reject(new Error('unexpected midpoint call')),
    );

    await expect(service.getComplement('703257')).rejects.toBeInstanceOf(
      PredictionMarketOutcomeTokensUnavailableError,
    );
  });

  it('rejects duplicate outcome token identities', async () => {
    const details = market();
    const service = createService(
      {
        ...details,
        outcomes: {
          ...details.outcomes,
          no: { ...details.outcomes.no, tokenId: '111' },
        },
      },
      () => Promise.reject(new Error('unexpected midpoint call')),
    );

    await expect(service.getComplement('703257')).rejects.toBeInstanceOf(
      PredictionMarketMidpointComplementIncoherentError,
    );
  });

  it('rejects a midpoint response identity mismatch', async () => {
    const service = createService(market(), (tokenId) =>
      Promise.resolve(midpoint(tokenId === '111' ? '222' : tokenId, '0.5')),
    );

    await expect(service.getComplement('703257')).rejects.toBeInstanceOf(
      PredictionMarketMidpointComplementIncoherentError,
    );
  });
});

function createService(
  details: PredictionMarketDetails,
  getMidpoint: (tokenId: string) => Promise<PredictionMarketOutcomeMidpoint>,
): PredictionMarketMidpointComplementService {
  return new PredictionMarketMidpointComplementService(
    new PredictionMarketDiscoveryService({
      listActive: () => Promise.reject(new Error('unexpected list call')),
      getById: () => Promise.resolve(details),
      getTagsById: () => Promise.reject(new Error('unexpected tags call')),
    }),
    new PredictionMarketPricingService({ getMidpoint }),
  );
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
    receivedAt: new Date('2026-09-27T14:00:00.000Z'),
  };
}

function midpoint(
  tokenId: string,
  price: string,
): PredictionMarketOutcomeMidpoint {
  return {
    provider: 'polymarket',
    tokenId,
    price,
    source: 'clob-midpoint',
    executable: false,
    providerTimestamp: null,
    receivedAt: new Date('2026-09-27T14:00:00.010Z'),
  };
}
