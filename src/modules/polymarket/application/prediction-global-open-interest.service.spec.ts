import type { PredictionGlobalOpenInterestProvider } from '../domain/prediction-market-open-interest';
import { PredictionGlobalOpenInterestService } from './prediction-global-open-interest.service';

describe('PredictionGlobalOpenInterestService', () => {
  it('delegates the public global open-interest observation', async () => {
    const observation = {
      provider: 'polymarket' as const,
      openInterestUsdc: '356037494.1056115',
      source: 'data-api-open-interest' as const,
      receivedAt: new Date('2026-09-28T06:00:00.000Z'),
      executable: false as const,
    };
    const getGlobalOpenInterest: PredictionGlobalOpenInterestProvider['getGlobalOpenInterest'] =
      () => Promise.resolve(observation);
    const service = new PredictionGlobalOpenInterestService({
      getGlobalOpenInterest,
    });

    await expect(service.getGlobalOpenInterest()).resolves.toBe(observation);
  });
});
