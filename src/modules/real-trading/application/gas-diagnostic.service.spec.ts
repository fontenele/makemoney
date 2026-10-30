import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import {
  GasDiagnosticService,
  GAS_DIAGNOSTIC_ACK,
} from './gas-diagnostic.service';
import { GasDiagnosticPlan, GasDiagnosticRecord } from './gas-diagnostic-store';
import { RealTradingStatusService } from './real-trading-status.service';
import { AgenticWalletMarketCostPreviewService } from './agentic-wallet-market-cost-preview.service';

const NOW = new Date('2026-10-30T14:00:00Z');
function harness() {
  let saved: GasDiagnosticRecord | null = null;
  let at = NOW;
  const config = new ConfigService({
    REAL_GAS_DIAGNOSTIC_ENABLED: true,
    TRADING_MODE: 'real',
    REAL_EXECUTION_ENABLED: true,
    REAL_EXECUTION_OPERATOR_SUBMISSION_ENABLED: false,
    REAL_RISK_MAX_DAILY_LOSS_USDT: '10',
    REAL_EXECUTION_APPROVED_PROVIDER_ID: 'agentic_wallet',
    REAL_EXECUTION_APPROVED_CHAIN_ID: '56',
    REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS:
      '0x55d398326f99059ff775485246999027b3197955',
    REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS:
      '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
  });
  const store = {
    prepare: jest.fn((plan: GasDiagnosticPlan) => {
      saved = {
        plan: structuredClone(plan),
        state: 'prepared',
        providerOrderId: null,
      };
      return Promise.resolve();
    }),
    read: jest.fn(() => Promise.resolve(saved ? structuredClone(saved) : null)),
    claim: jest.fn(() => {
      if (!saved || saved.state !== 'prepared')
        return Promise.reject(new Error('already claimed'));
      saved.state = 'claimed';
      return Promise.resolve();
    }),
    recordOutcome: jest.fn((_id: string, orderId: string | null) => {
      if (saved) {
        saved.state = orderId ? 'submitted' : 'unknown';
        saved.providerOrderId = orderId;
      }
      return Promise.resolve();
    }),
  };
  const limits = {
    maximumOrderNotionalUsdt: '1',
    maximumDailySpendUsdt: '2',
    maximumBankrollUsdt: '12',
    maximumProviderFeeRate: '0.005',
    maximumNetworkFeeUsdt: '0.5',
    maximumSlippageRate: '0.005',
  };
  const wallet = {
    getLocalStatus: () => ({ localRiskLimits: { status: 'defined', limits } }),
    observeWallet: () =>
      Promise.resolve({
        connection: 'connected',
        observedAt: at,
        quota: { date: '2026-10-30', usedUsd: '0', remainingUsd: '10' },
        securityAssessment: { status: 'restrictive' },
      }),
    verifyFunding: () =>
      Promise.resolve({
        status: 'funds_observed',
        observedAt: at,
        walletAddress: '0x' + 'a'.repeat(40),
        assets: [],
      }),
    loadFundingValuation: () =>
      Promise.resolve({
        status: 'available',
        balanceObservedAt: at,
        pricesObservedAt: at,
        balance: {
          totalValueUsdt: '6.5',
          quantityUsdt: '3',
          quantityBnb: '0.005',
        },
        prices: { bnbUsdt: '700' },
      }),
  } as unknown as Pick<
    RealTradingStatusService,
    | 'getLocalStatus'
    | 'observeWallet'
    | 'verifyFunding'
    | 'loadFundingValuation'
  >;
  const quotes = {
    load: jest.fn(() =>
      Promise.resolve({
        quoteCurrent: true,
        feeEvidence: { providerFeeRate: '0' },
        quote: {
          expectedTargetQuantity: '0.00001',
          minimumTargetQuantity: '0.00000995',
          expiresAt: new Date(at.getTime() + 5000),
          intent: { maxSlippageRate: '0.005' },
        },
      }),
    ),
  };
  const transport = {
    submit: jest.fn<() => Promise<string | null>>().mockResolvedValue('123'),
    measure: jest.fn(() => Promise.resolve({ gasMeasurementAvailable: true })),
  };
  const stop = { isActive: jest.fn(() => false) };
  const service = new GasDiagnosticService(
    config,
    wallet,
    quotes as unknown as Pick<AgenticWalletMarketCostPreviewService, 'load'>,
    stop,
    store,
    transport,
    () => at,
  );
  return {
    config,
    store,
    quotes,
    transport,
    stop,
    service,
    saved: () => saved,
    advance: () => {
      at = new Date(NOW.getTime() + 180001);
    },
  };
}

describe('gas diagnostic flow', () => {
  it('reports the indicative gas percentage with the explicitly stored preparation price', async () => {
    const h = harness();
    const { plan } = await h.service.prepare({});
    h.config.set('REAL_EXECUTION_OPERATOR_SUBMISSION_ENABLED', true);
    h.transport.measure.mockImplementation(() =>
      Promise.resolve({
        gasMeasurementAvailable: true,
        measuredNetworkFeeBnb: '0.000021',
      }),
    );
    await h.service.submit({
      planId: plan.id,
      fingerprint: plan.fingerprint,
      acknowledgment: GAS_DIAGNOSTIC_ACK,
    });
    await expect(h.service.read(plan.id)).resolves.toMatchObject({
      measurement: {
        indicativeNetworkFeeUsdt: '0.0147',
        indicativeGasPercentageOfOneUsdt: '1.47',
        conversionBasis:
          'preparation_bnb_usdt_price_not_historical_execution_price',
      },
    });
  });
  it('blocks increased loss exposure before claiming or submitting', async () => {
    const h = harness();
    const { plan } = await h.service.prepare({});
    h.config.set('REAL_EXECUTION_OPERATOR_SUBMISSION_ENABLED', true);
    h.saved()!.plan.maximumPotentialLossUsdt = '4.4';
    await expect(
      h.service.submit({
        planId: plan.id,
        fingerprint: plan.fingerprint,
        acknowledgment: GAS_DIAGNOSTIC_ACK,
      }),
    ).rejects.toThrow('loss envelope changed');
    expect(h.store.claim).not.toHaveBeenCalled();
    expect(h.transport.submit).not.toHaveBeenCalled();
  });
  it('prepares a durable review without submitting or exposing wallet identity', async () => {
    const h = harness();
    const review = await h.service.prepare({});
    expect(review).toMatchObject({
      sourceQuantityUsdt: '1',
      gasEstimateAvailable: false,
      gasCostCeilingGuaranteed: false,
      automaticRetryAllowed: false,
      submissionAuthorized: false,
    });
    expect(review.plan).not.toHaveProperty('walletHash');
    expect(h.store.prepare).toHaveBeenCalledTimes(1);
    expect(h.transport.submit).not.toHaveBeenCalled();
  });
  it('does not enable submission merely by preparing', async () => {
    const h = harness();
    const { plan } = await h.service.prepare({});
    await expect(
      h.service.submit({
        planId: plan.id,
        fingerprint: plan.fingerprint,
        acknowledgment: GAS_DIAGNOSTIC_ACK,
      }),
    ).rejects.toThrow('submission is disabled');
    expect(h.transport.submit).not.toHaveBeenCalled();
  });
  it('claims durably once before the sole provider call and rejects repetition', async () => {
    const h = harness();
    const { plan } = await h.service.prepare({});
    h.config.set('REAL_EXECUTION_OPERATOR_SUBMISSION_ENABLED', true);
    h.transport.submit.mockImplementation(() => {
      expect(h.saved()?.state).toBe('claimed');
      return Promise.resolve('123');
    });
    const request = {
      planId: plan.id,
      fingerprint: plan.fingerprint,
      acknowledgment: GAS_DIAGNOSTIC_ACK,
    };
    await expect(h.service.submit(request)).resolves.toMatchObject({
      state: 'submitted_pending_confirmation',
      executionSucceeded: false,
    });
    await expect(h.service.submit(request)).rejects.toThrow();
    expect(h.transport.submit).toHaveBeenCalledTimes(1);
  });
  it('persists unknown on timeout and never retries an ambiguous order', async () => {
    const h = harness();
    const { plan } = await h.service.prepare({});
    h.config.set('REAL_EXECUTION_OPERATOR_SUBMISSION_ENABLED', true);
    h.transport.submit.mockRejectedValue(new Error('timeout'));
    const request = {
      planId: plan.id,
      fingerprint: plan.fingerprint,
      acknowledgment: GAS_DIAGNOSTIC_ACK,
    };
    await expect(h.service.submit(request)).resolves.toMatchObject({
      state: 'submission_outcome_unknown',
    });
    await expect(h.service.submit(request)).rejects.toThrow();
    expect(h.transport.submit).toHaveBeenCalledTimes(1);
  });
  it('requires exact acknowledgment and a non-expired reviewed plan', async () => {
    const h = harness();
    const { plan } = await h.service.prepare({});
    h.config.set('REAL_EXECUTION_OPERATOR_SUBMISSION_ENABLED', true);
    await expect(
      h.service.submit({
        planId: plan.id,
        fingerprint: plan.fingerprint,
        acknowledgment: 'yes',
      }),
    ).rejects.toThrow();
    h.advance();
    await expect(
      h.service.submit({
        planId: plan.id,
        fingerprint: plan.fingerprint,
        acknowledgment: GAS_DIAGNOSTIC_ACK,
      }),
    ).rejects.toThrow();
    expect(h.transport.submit).not.toHaveBeenCalled();
  });
  it('rechecks emergency stop and keeps provider submission unreachable', async () => {
    const h = harness();
    const { plan } = await h.service.prepare({});
    h.config.set('REAL_EXECUTION_OPERATOR_SUBMISSION_ENABLED', true);
    h.stop.isActive.mockReturnValue(true);
    await expect(
      h.service.submit({
        planId: plan.id,
        fingerprint: plan.fingerprint,
        acknowledgment: GAS_DIAGNOSTIC_ACK,
      }),
    ).rejects.toThrow();
    expect(h.transport.submit).not.toHaveBeenCalled();
  });
  it.each([null, { sourceQuantity: '2' }, []])(
    'rejects non-empty preparation requests %j',
    async (body) => {
      const h = harness();
      await expect(h.service.prepare(body)).rejects.toThrow();
      expect(h.quotes.load).not.toHaveBeenCalled();
    },
  );
});
