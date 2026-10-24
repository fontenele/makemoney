import { jest } from '@jest/globals';

import { BscFundingConversionPostBalanceReader } from './bsc-funding-conversion-post-balance.reader';

const WALLET = '0x1111111111111111111111111111111111111111';

describe('BscFundingConversionPostBalanceReader', () => {
  it('reuses the exact fixed-block balance reader and marks the post snapshot', async () => {
    const load = jest.fn(() =>
      Promise.resolve({
        scope:
          'agentic_wallet_funding_conversion_pre_balance_snapshot' as const,
        chainId: '56' as const,
        walletAddress: WALLET,
        blockNumber: '0x11',
        bnbBalance: '0.991',
        usdtBalance: '5.9',
        observedAt: new Date('2026-10-24T12:00:00.000Z'),
      }),
    );
    const reader = new BscFundingConversionPostBalanceReader({
      load,
    });

    await expect(reader.load(WALLET)).resolves.toEqual({
      scope: 'agentic_wallet_funding_conversion_post_balance_snapshot',
      chainId: '56',
      walletAddress: WALLET,
      blockNumber: '0x11',
      bnbBalance: '0.991',
      usdtBalance: '5.9',
      observedAt: new Date('2026-10-24T12:00:00.000Z'),
    });
    expect(load).toHaveBeenCalledWith(WALLET, undefined);
  });
});
