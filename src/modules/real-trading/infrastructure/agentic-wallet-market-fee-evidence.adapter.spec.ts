import { jest } from '@jest/globals';
import {
  AgenticWalletMarketFeeEvidenceAdapter,
  parseMarketFeeDisplay,
} from './agentic-wallet-market-fee-evidence.adapter';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT as instrument } from '../application/real-execution-instrument-approval';
import { RealExecutionIntent } from '../domain/real-execution';

const NOW = new Date('2026-10-29T20:00:00.000Z');
const display = (source = 'USDT', target = 'BTCB') =>
  `Swap Quote\nFrom: 2 ${source}\nTo: 0.00002 ${target}\nSlippage: 0.50%\nFee: 0.1%\nFee (USD): $0.002\nGas (USD): $0.0007\nGas Mode: fast`;
const intent = (sell = false): RealExecutionIntent => ({
  id: '11111111-1111-4111-8111-111111111111',
  idempotencyKey: 'fee-preview',
  kind: 'market_swap',
  chainId: '56',
  sourceAsset: sell ? instrument.btc : instrument.usdt,
  targetAsset: sell ? instrument.usdt : instrument.btc,
  sourceQuantity: '2',
  maxSlippageRate: '0.005',
  createdAt: NOW,
});

describe('AgenticWalletMarketFeeEvidenceAdapter', () => {
  it.each([false, true])(
    'reads only the approved quote direction (sell=%s)',
    async (sell) => {
      const run = jest.fn(() =>
        Promise.resolve(
          display(sell ? 'BTCB' : 'USDT', sell ? 'USDT' : 'BTCB'),
        ),
      );
      const adapter = new AgenticWalletMarketFeeEvidenceAdapter(
        { run },
        {
          run: () =>
            Promise.resolve({
              success: true,
              data: { currentCliVersion: '1.10.0', needUpdateCli: false },
            }),
        },
        () => NOW,
      );
      const result = await adapter.load(intent(sell));
      expect(result).toMatchObject({
        providerFeeRate: '0.001',
        providerFeeUsd: '0.002',
        estimatedNetworkFeeUsd: '0.0007',
        coverage: 'provider_display_estimate',
        observedAt: NOW,
      });
      expect(run.mock.calls[0]).toBeDefined();
      expect(result.observedAt).not.toBe(NOW);
    },
  );
  it.each([
    display().replace('From: 2 USDT', 'From: 1 USDT'),
    display().replace('0.50%', '0.40%'),
    display().replace('BTCB', 'BTC'),
    display() + '\nextra',
    display().replace('$0.0007', '$NaN'),
  ])('rejects divergent or malformed text %#', async (output) => {
    const adapter = new AgenticWalletMarketFeeEvidenceAdapter(
      { run: () => Promise.resolve(output) },
      {
        run: () =>
          Promise.resolve({
            success: true,
            data: { currentCliVersion: '1.10.0', needUpdateCli: false },
          }),
      },
    );
    await expect(adapter.load(intent())).rejects.toThrow();
  });
  it('rejects unapproved instruments before any process access', async () => {
    const run = jest.fn(() => Promise.resolve(''));
    await expect(
      new AgenticWalletMarketFeeEvidenceAdapter({ run }).load({
        ...intent(),
        chainId: '1',
      }),
    ).rejects.toThrow('not approved');
    expect(run).not.toHaveBeenCalled();
  });
  it('keeps a zero USD gas display as an estimate', () => {
    expect(
      parseMarketFeeDisplay(
        display().replace('$0.0007', '$0'),
        'id',
        'USDT',
        'BTCB',
        NOW,
      ),
    ).toMatchObject({
      estimatedNetworkFeeUsd: '0',
      coverage: 'provider_display_estimate',
    });
  });
});
