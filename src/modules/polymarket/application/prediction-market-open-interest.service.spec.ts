import { jest } from '@jest/globals';
import { PredictionMarketConditionUnavailableError } from '../domain/prediction-market-binary-resolution';
import {
  PredictionMarketOpenInterestIncoherentError,
  PredictionMarketOpenInterestProvider,
} from '../domain/prediction-market-open-interest';
import type { PredictionMarketProvider } from '../domain/prediction-market';
import { PredictionMarketDiscoveryService } from './prediction-market-discovery.service';
import { PredictionMarketOpenInterestService } from './prediction-market-open-interest.service';

describe('PredictionMarketOpenInterestService', () => {
  it('joins a selected market to its condition open interest', async () => {
    const receivedAt = new Date('2026-09-28T04:00:00.000Z');
    const service = createService(market(), {
      provider: 'polymarket',
      conditionId: conditionId(),
      openInterestUsdc: '7113116.142022',
      source: 'data-api-open-interest',
      receivedAt,
    });

    await expect(service.getOpenInterest('703257')).resolves.toEqual({
      provider: 'polymarket',
      market: market(),
      conditionId: conditionId(),
      openInterestUsdc: '7113116.142022',
      source: 'data-api-open-interest',
      receivedAt,
      executable: false,
    });
  });

  it('rejects a market without a condition before provider loading', async () => {
    const getOpenInterest =
      jest.fn<PredictionMarketOpenInterestProvider['getOpenInterest']>();
    const service = createService(
      { ...market(), conditionId: null },
      undefined,
      getOpenInterest,
    );

    await expect(service.getOpenInterest('703257')).rejects.toThrow(
      PredictionMarketConditionUnavailableError,
    );
    expect(getOpenInterest).not.toHaveBeenCalled();
  });

  it('rejects provider condition identity divergence', async () => {
    const service = createService(market(), {
      provider: 'polymarket',
      conditionId: `0x${'b'.repeat(64)}`,
      openInterestUsdc: '1',
      source: 'data-api-open-interest',
      receivedAt: new Date('2026-09-28T04:00:00.000Z'),
    });

    await expect(service.getOpenInterest('703257')).rejects.toThrow(
      PredictionMarketOpenInterestIncoherentError,
    );
  });
});

function createService(
  details: ReturnType<typeof market>,
  observation?: Awaited<
    ReturnType<PredictionMarketOpenInterestProvider['getOpenInterest']>
  >,
  getOpenInterest: PredictionMarketOpenInterestProvider['getOpenInterest'] = () =>
    Promise.resolve(observation!),
) {
  const discovery = new PredictionMarketDiscoveryService({
    getById: () => Promise.resolve(details),
  } as PredictionMarketProvider);
  return new PredictionMarketOpenInterestService(discovery, {
    getOpenInterest,
  });
}

function market() {
  return {
    provider: 'polymarket' as const,
    id: '703257',
    slug: 'example',
    question: 'Example?',
    conditionId: conditionId(),
    outcomes: {
      yes: { label: 'Yes', tokenId: '1' },
      no: { label: 'No', tokenId: '2' },
    },
    receivedAt: new Date('2026-09-28T03:59:00.000Z'),
  };
}

function conditionId(): string {
  return `0x${'a'.repeat(64)}`;
}
