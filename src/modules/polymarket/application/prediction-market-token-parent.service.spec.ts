import { jest } from '@jest/globals';
import { PredictionMarketTokenParentProvider } from '../domain/prediction-market-token-parent';
import { PredictionMarketTokenParentService } from './prediction-market-token-parent.service';

describe('PredictionMarketTokenParentService', () => {
  it('delegates one canonical token identity to the provider', async () => {
    const observation = {
      provider: 'polymarket' as const,
      requestedTokenId: '111',
      requestedOutcome: 'yes' as const,
      conditionId: `0x${'a'.repeat(64)}`,
      outcomes: { yes: { tokenId: '111' }, no: { tokenId: '222' } },
      source: 'clob-market-by-token' as const,
      receivedAt: new Date('2026-09-29T12:00:00Z'),
      executable: false as const,
    };
    const getByToken = jest
      .fn<PredictionMarketTokenParentProvider['getByToken']>()
      .mockResolvedValue(observation);
    const service = new PredictionMarketTokenParentService({ getByToken });

    await expect(service.getByToken('111')).resolves.toEqual(observation);
    expect(getByToken).toHaveBeenCalledWith('111', undefined);
  });
});
