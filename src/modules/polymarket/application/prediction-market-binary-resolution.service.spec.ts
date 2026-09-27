import {
  PredictionMarketBinaryResolutionIncoherentError,
  PredictionMarketBinaryResolutionUnavailableError,
  PredictionMarketConditionUnavailableError,
} from '../domain/prediction-market-binary-resolution';
import type { PredictionMarketResolutionRecord } from '../domain/prediction-market-resolution';
import type { PredictionMarketDetails } from '../domain/prediction-market';
import { PredictionMarketBinaryResolutionService } from './prediction-market-binary-resolution.service';
import { PredictionMarketDiscoveryService } from './prediction-market-discovery.service';
import { PredictionMarketResolutionService } from './prediction-market-resolution.service';

describe('PredictionMarketBinaryResolutionService', () => {
  it.each([
    [['1', '0'], 'yes', 'winner', 'loser'],
    [['0', '1'], 'no', 'loser', 'winner'],
    [['0.5', '0.5'], 'fifty_fifty', 'split', 'split'],
  ] as const)(
    'interprets binary payout vector %j as %s',
    async (payouts, result, yesStatus, noStatus) => {
      const service = createService(market(), resolution([...payouts]));

      await expect(service.getResolution('703257')).resolves.toMatchObject({
        result,
        payouts: {
          yes: { label: 'Yes', tokenId: '111', status: yesStatus },
          no: { label: 'No', tokenId: '222', status: noStatus },
        },
        executable: false,
      });
    },
  );

  it('maps payout indexes to the existing indexed YES and NO identities', async () => {
    const value = await createService(
      market(),
      resolution(['1', '0']),
    ).getResolution('703257');

    expect(value.payouts).toEqual({
      yes: {
        label: 'Yes',
        tokenId: '111',
        payoutRate: '1',
        status: 'winner',
      },
      no: {
        label: 'No',
        tokenId: '222',
        payoutRate: '0',
        status: 'loser',
      },
    });
    expect('payouts' in value.resolution).toBe(false);
  });

  it('rejects a market without a condition identity before resolution loading', async () => {
    const service = createService(
      { ...market(), conditionId: null },
      resolution(['1', '0']),
    );

    await expect(service.getResolution('703257')).rejects.toBeInstanceOf(
      PredictionMarketConditionUnavailableError,
    );
  });

  it.each([null, [], ['1'], ['0.7', '0.3'], ['1', '1']] as const)(
    'rejects unavailable or unsupported binary payout vector %j',
    async (payouts) => {
      const service = createService(
        market(),
        resolution(payouts === null ? null : [...payouts]),
      );

      await expect(service.getResolution('703257')).rejects.toBeInstanceOf(
        PredictionMarketBinaryResolutionUnavailableError,
      );
    },
  );

  it('rejects resolution identity divergence', async () => {
    const service = createService(market(), {
      ...resolution(['1', '0']),
      conditionId: `0x${'b'.repeat(64)}`,
    });

    await expect(service.getResolution('703257')).rejects.toBeInstanceOf(
      PredictionMarketBinaryResolutionIncoherentError,
    );
  });
});

function createService(
  details: PredictionMarketDetails,
  record: PredictionMarketResolutionRecord,
): PredictionMarketBinaryResolutionService {
  return new PredictionMarketBinaryResolutionService(
    new PredictionMarketDiscoveryService({
      listActive: () => Promise.reject(new Error('unexpected list call')),
      getById: () => Promise.resolve(details),
      getTagsById: () => Promise.reject(new Error('unexpected tags call')),
    }),
    new PredictionMarketResolutionService({
      getResolution: () => Promise.resolve(record),
    }),
  );
}

function market(): PredictionMarketDetails {
  return {
    provider: 'polymarket',
    id: '703257',
    slug: 'will-example-happen',
    question: 'Will the example happen?',
    conditionId: conditionId(),
    outcomes: {
      yes: { label: 'Yes', tokenId: '111' },
      no: { label: 'No', tokenId: '222' },
    },
    receivedAt: new Date('2026-09-27T18:00:00.000Z'),
  };
}

function resolution(
  payouts: readonly string[] | null,
): PredictionMarketResolutionRecord {
  return {
    provider: 'polymarket',
    conditionId: conditionId(),
    status: 'resolved',
    extendedReview: false,
    wasDisputed: false,
    wasArbitrated: false,
    resolvedAt: '2026-09-27T17:00:00Z',
    source: 'data-api-resolution',
    receivedAt: new Date('2026-09-27T18:00:00.010Z'),
    payouts,
  };
}

function conditionId(): string {
  return `0x${'a'.repeat(64)}`;
}
