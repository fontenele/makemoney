import { jest } from '@jest/globals';

import { AgenticWalletCliJsonProcess } from './agentic-wallet-cli-json-process';
import { AgenticWalletCliTextProcess } from './agentic-wallet-cli-text-process';
import { AgenticWalletFundingConversionFeeEvidenceAdapter } from './agentic-wallet-funding-conversion-fee-evidence.adapter';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';

describe('AgenticWalletFundingConversionFeeEvidenceAdapter', () => {
  it('reads exact provider fee evidence from the pinned live quote display', async () => {
    const text = jest.fn(() => Promise.resolve(quote()));
    const json = jest.fn(() =>
      Promise.resolve({
        success: true,
        data: { currentCliVersion: '1.10.0', needUpdateCli: false },
      }),
    );
    const adapter = createAdapter(text, json);

    await expect(
      adapter.load({
        sourceQuantityBnb: '0.008',
        maximumSlippagePercent: '0.5',
      }),
    ).resolves.toEqual({
      scope: 'agentic_wallet_funding_conversion_fee_evidence',
      provider: 'agentic_wallet',
      chainId: '56',
      sourceQuantityBnb: '0.008',
      expectedUsdt: '5.935165751011499134',
      maximumSlippagePercent: '0.5',
      providerFeeRate: '0',
      providerFeeUsd: '0',
      estimatedNetworkFeeUsd: '0',
      gasMode: 'fast',
      observedAt: new Date('2026-10-23T20:30:00.000Z'),
    });
    expect(text).toHaveBeenCalledWith(
      [
        'market-order',
        'quote',
        '--fromTokenQty',
        '0.008',
        '--fromToken',
        BSC_NATIVE_BNB_ADDRESS,
        '--toToken',
        BSC_USDT_ADDRESS,
        '--binanceChainId',
        '56',
        '--slippage',
        '0.5',
      ],
      undefined,
    );
  });

  it.each([
    [quote().replace('0.008 BNB', '0.007 BNB'), 'context diverged'],
    [quote().replace('0.50%', '0.40%'), 'context diverged'],
    [
      quote().replace('Fee:         0%', 'Fee:         unknown'),
      'response is invalid',
    ],
    [
      quote().replace('Gas Mode:    fast', 'Gas Mode:    fast\nextra'),
      'response is invalid',
    ],
  ])(
    'rejects malformed or divergent display evidence %#',
    async (output, message) => {
      await expect(
        createAdapter(jest.fn(() => Promise.resolve(output))).load({
          sourceQuantityBnb: '0.008',
          maximumSlippagePercent: '0.5',
        }),
      ).rejects.toThrow(message);
    },
  );
});

function createAdapter(
  text: jest.Mock<(args: readonly string[]) => Promise<string>>,
  json: jest.Mock<(args: readonly string[]) => Promise<unknown>> = jest.fn(() =>
    Promise.resolve({
      success: true,
      data: { currentCliVersion: '1.10.0', needUpdateCli: false },
    }),
  ),
) {
  return new AgenticWalletFundingConversionFeeEvidenceAdapter(
    { run: text } as unknown as AgenticWalletCliTextProcess,
    { run: json } as unknown as AgenticWalletCliJsonProcess,
    () => new Date('2026-10-23T20:30:00.000Z'),
  );
}

function quote(): string {
  return `Swap Quote
From:        0.008 BNB
To:          5.935165751011499134 USDT
Slippage:    0.50%
Fee:         0%
Fee (USD):   $0
Gas (USD):   $0
Gas Mode:    fast`;
}
