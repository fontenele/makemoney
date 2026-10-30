import { jest } from '@jest/globals';
import {
  AgenticWalletMarketQuoteService,
  InvalidMarketQuoteRequestError,
} from './agentic-wallet-market-quote.service';
import {
  RealTradingStatusService,
  AgenticWalletFundingVerification,
} from './real-trading-status.service';
import { assessRealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';
import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';

function harness() {
  const limits = assessRealExecutionLocalRiskLimits({
    maximumOrderNotionalUsdt: '5',
    maximumDailySpendUsdt: '10',
    maximumBankrollUsdt: '20',
    maximumProviderFeeRate: '0.01',
    maximumNetworkFeeUsdt: '0.5',
    maximumSlippageRate: '0.005',
  });
  const local = { localRiskLimits: limits } as ReturnType<
    RealTradingStatusService['getLocalStatus']
  >;
  const funding = {
    status: 'funds_observed',
    assets: [
      { symbol: 'USDT', quantity: '4' },
      { symbol: 'BTCB', quantity: '0.001' },
    ],
  } as AgenticWalletFundingVerification;
  const verifyFunding = jest
    .fn<() => Promise<AgenticWalletFundingVerification>>()
    .mockResolvedValue(funding);
  const load = jest
    .fn<(intent: RealExecutionIntent) => Promise<RealExecutionQuote>>()
    .mockImplementation((intent) =>
      Promise.resolve({
        id: '22222222-2222-4222-8222-222222222222',
        providerId: 'agentic_wallet',
        providerQuoteId: null,
        intent,
        expectedTargetQuantity: '0.00001',
        minimumTargetQuantity: '0.00000995',
        costs: [],
        costCoverage: 'partial',
        quotedAt: new Date(),
        expiresAt: new Date(Date.now() + 5000),
        executable: false,
      }),
    );
  const service = new AgenticWalletMarketQuoteService(
    { getLocalStatus: () => local, verifyFunding },
    { load },
  );
  return { service, local, funding, load, verifyFunding };
}

describe('AgenticWalletMarketQuoteService', () => {
  it('prepares an approved intent without requesting a market quote', async () => {
    const h = harness();
    await expect(
      h.service.prepare({ side: 'buy', sourceQuantity: '2' }),
    ).resolves.toMatchObject({
      status: 'quote_preview_ready',
      intent: { sourceQuantity: '2', sourceAsset: { symbol: 'USDT' } },
      providerCallStarted: false,
    });
    expect(h.load).not.toHaveBeenCalled();
    expect(h.verifyFunding).toHaveBeenCalledTimes(1);
  });
  it.each([
    null,
    {},
    { side: 'buy' },
    { side: 'withdraw', sourceQuantity: '1' },
    { side: 'buy', sourceQuantity: '0' },
    { side: 'buy', sourceQuantity: '1e2' },
    { side: 'buy', sourceQuantity: '1', chainId: '1' },
    { side: 'buy', sourceQuantity: '1'.repeat(100) },
  ])(
    'rejects malformed input before dependency access: %j',
    async (request) => {
      const h = harness();
      await expect(h.service.load(request)).rejects.toBeInstanceOf(
        InvalidMarketQuoteRequestError,
      );
      expect(h.verifyFunding).not.toHaveBeenCalled();
      expect(h.load).not.toHaveBeenCalled();
    },
  );

  it('quotes one exact buy with server-owned instrument and no execution authority', async () => {
    const h = harness();
    const result = await h.service.load({
      side: 'buy',
      sourceQuantity: '2.00',
    });
    expect(result).toMatchObject({
      status: 'quote_available',
      submissionAuthorized: false,
      riskApproved: false,
      reservationCreated: false,
      quote: {
        executable: false,
        costCoverage: 'partial',
        intent: {
          chainId: '56',
          sourceQuantity: '2',
          sourceAsset: { symbol: 'USDT' },
          targetAsset: { symbol: 'BTCB' },
        },
      },
    });
    expect(h.load).toHaveBeenCalledTimes(1);
  });

  it('blocks excessive buy notional before wallet access', async () => {
    const h = harness();
    await expect(
      h.service.load({ side: 'buy', sourceQuantity: '5.000000000000000001' }),
    ).resolves.toMatchObject({
      blockers: ['maximum_order_notional_exceeded'],
      quote: null,
    });
    expect(h.verifyFunding).not.toHaveBeenCalled();
  });

  it('blocks undefined limits before wallet access', async () => {
    const h = harness();
    Object.assign(h.local.localRiskLimits, { status: 'blocked' });
    await expect(
      h.service.load({ side: 'buy', sourceQuantity: '1' }),
    ).resolves.toMatchObject({ blockers: ['local_risk_limits_blocked'] });
    expect(h.verifyFunding).not.toHaveBeenCalled();
  });

  it.each(['funding', 'balance'])(
    'blocks %s before quoting',
    async (failure) => {
      const h = harness();
      if (failure === 'funding')
        Object.assign(h.funding, { status: 'blocked' });
      const amount = failure === 'balance' ? '4.000000000000000001' : '1';
      await expect(
        h.service.load({ side: 'buy', sourceQuantity: amount }),
      ).resolves.toMatchObject({ status: 'blocked', quote: null });
      expect(h.load).not.toHaveBeenCalled();
    },
  );

  it('reverses the approved direction for sells and checks returned USDT notional', async () => {
    const h = harness();
    h.load.mockImplementation((intent) =>
      Promise.resolve({
        id: 'quote',
        providerId: 'agentic_wallet',
        providerQuoteId: null,
        intent,
        expectedTargetQuantity: '5.000000000000000001',
        minimumTargetQuantity: '4.9',
        costs: [],
        costCoverage: 'partial',
        quotedAt: new Date(),
        expiresAt: new Date(),
        executable: false,
      }),
    );
    await expect(
      h.service.load({ side: 'sell', sourceQuantity: '0.001' }),
    ).resolves.toMatchObject({
      status: 'blocked',
      providerCallStarted: true,
      quote: null,
    });
    expect(h.load.mock.calls[0][0]).toMatchObject({
      sourceAsset: { symbol: 'BTCB' },
      targetAsset: { symbol: 'USDT' },
    });
  });

  it('does not retry provider failures', async () => {
    const h = harness();
    h.load.mockRejectedValue(new Error('provider failure'));
    await expect(
      h.service.load({ side: 'buy', sourceQuantity: '1' }),
    ).rejects.toThrow('provider failure');
    expect(h.load).toHaveBeenCalledTimes(1);
  });
});
