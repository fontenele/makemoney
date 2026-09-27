import { jest } from '@jest/globals';
import { PredictionMarketResolutionProvider } from '../domain/prediction-market-resolution';
import { PredictionMarketResolutionService } from './prediction-market-resolution.service';

describe('PredictionMarketResolutionService', () => {
  it('omits internal payouts from the public lifecycle observation', async () => {
    const receivedAt = new Date('2026-09-27T18:00:00.000Z');
    const observation = {
      provider: 'polymarket' as const,
      conditionId: conditionId(),
      status: 'resolved',
      extendedReview: false,
      wasDisputed: true,
      wasArbitrated: false,
      resolvedAt: '2026-09-27T17:00:00Z',
      source: 'data-api-resolution' as const,
      receivedAt,
      payouts: ['0', '1'],
    };
    const getResolution = jest
      .fn<PredictionMarketResolutionProvider['getResolution']>()
      .mockResolvedValue(observation);

    await expect(
      new PredictionMarketResolutionService({ getResolution }).getResolution(
        conditionId(),
      ),
    ).resolves.toEqual({
      provider: 'polymarket',
      conditionId: conditionId(),
      status: 'resolved',
      extendedReview: false,
      wasDisputed: true,
      wasArbitrated: false,
      resolvedAt: '2026-09-27T17:00:00Z',
      source: 'data-api-resolution',
      receivedAt,
    });
    expect(getResolution).toHaveBeenCalledWith(conditionId(), undefined);
  });

  it('retains payouts only for internal resolution composition', async () => {
    const record = {
      provider: 'polymarket' as const,
      conditionId: conditionId(),
      status: 'resolved',
      extendedReview: false,
      wasDisputed: false,
      wasArbitrated: false,
      resolvedAt: null,
      source: 'data-api-resolution' as const,
      receivedAt: new Date('2026-09-27T18:00:00.000Z'),
      payouts: ['1', '0'],
    };
    const service = new PredictionMarketResolutionService({
      getResolution: () => Promise.resolve(record),
    });

    await expect(service.getResolutionRecord(conditionId())).resolves.toBe(
      record,
    );
  });
});

function conditionId(): string {
  return `0x${'a'.repeat(64)}`;
}
