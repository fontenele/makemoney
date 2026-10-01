import {
  RealExecutionAsset,
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { RealExecutionBudgetSnapshot } from './real-execution-budget-risk';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';
import { RealExecutionProviderQuotaSnapshot } from './real-execution-provider-quota-risk';
import {
  planRealExecutionReservation,
  RealExecutionReservationPlanAssessment,
} from './real-execution-reservation-plan';
import { RealExecutionResourceSnapshot } from './real-execution-resource-risk';

const EVALUATED_AT = new Date('2026-10-01T14:00:02.000Z');
const BTCB: RealExecutionAsset = {
  tokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
  symbol: 'BTCB',
};
const USDT: RealExecutionAsset = {
  tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
  symbol: 'USDT',
};

describe('planRealExecutionReservation', () => {
  it('creates an exact inert reservation plan after every upstream check passes', () => {
    expect(assessment()).toEqual({
      scope: 'real_execution_reservation_plan',
      status: 'reservation_plan_ready',
      blockers: [],
      providerQuotaRiskStatus: 'provider_quota_sufficient',
      plan: {
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: '11111111-1111-4111-8111-111111111111',
        quoteId: '22222222-2222-4222-8222-222222222222',
        idempotencyKey: 'reservation-plan-1',
        utcDay: '2026-10-01',
        budgetChargeUsdt: '5.105',
        sourceTokenAddress: USDT.tokenAddress,
        sourceSymbol: 'USDT',
        sourceQuantity: '5.005',
        nativeGasSymbol: 'BNB',
        nativeGasQuantity: '0.0002',
        providerQuotaUsd: '5.2',
        expiresAt: new Date('2026-10-01T14:00:06.000Z'),
        plannedAt: EVALUATED_AT,
      },
      durableReservationCreated: false,
      atomicEnforcement: false,
      riskApproved: false,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
      evaluatedAt: EVALUATED_AT,
    });
  });

  it('plans the approved sell direction with independent denomination amounts', () => {
    const sellIntent = intent({
      sourceAsset: BTCB,
      targetAsset: USDT,
      sourceQuantity: '0.0001',
    });
    const sellQuote = quote({
      intent: sellIntent,
      expectedTargetQuantity: '8',
      minimumTargetQuantity: '7.96',
      costs: [
        { kind: 'provider_fee', asset: BTCB, quantity: '0.0000001' },
        { kind: 'network_fee', asset: USDT, quantity: '0.1' },
      ],
    });
    const result = assessment(
      sellIntent,
      sellQuote,
      resourceSnapshot({
        sourceTokenAddress: BTCB.tokenAddress,
        sourceSymbol: 'BTCB',
        sourceAvailableQuantity: '0.0001001',
      }),
      quotaSnapshot({ requiredUsd: '8.3' }),
    );

    expect(result.plan).toMatchObject({
      budgetChargeUsdt: '8.108',
      sourceTokenAddress: BTCB.tokenAddress,
      sourceSymbol: 'BTCB',
      sourceQuantity: '0.0001001',
      nativeGasQuantity: '0.0002',
      providerQuotaUsd: '8.3',
    });
  });

  it('does not produce a plan when provider quota risk is blocked', () => {
    expect(
      assessment(
        intent(),
        quote(),
        resourceSnapshot(),
        quotaSnapshot({ remainingUsd: '5.199', usedUsd: '994.801' }),
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['provider_quota_risk_blocked'],
      providerQuotaRiskStatus: 'blocked',
      plan: null,
      durableReservationCreated: false,
      riskApproved: false,
    });
  });

  it('does not produce a plan when the quote is no longer valid', () => {
    expect(
      assessment(
        intent(),
        quote({ expiresAt: EVALUATED_AT }),
        resourceSnapshot(),
        quotaSnapshot(),
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['provider_quota_risk_blocked'],
      plan: null,
      submissionAuthorized: false,
    });
  });
});

function assessment(
  valueIntent = intent(),
  valueQuote = quote(),
  valueResourceSnapshot = resourceSnapshot(),
  valueQuotaSnapshot = quotaSnapshot(),
): RealExecutionReservationPlanAssessment {
  return planRealExecutionReservation(
    valueIntent,
    valueQuote,
    limits(),
    budgetSnapshot(),
    valueResourceSnapshot,
    valueQuotaSnapshot,
    {
      budgetSnapshotMaxAgeMs: 5000,
      resourceSnapshotMaxAgeMs: 5000,
      quotaSnapshotMaxAgeMs: 5000,
      requirementValuationMaxAgeMs: 5000,
    },
    EVALUATED_AT,
  );
}

function intent(
  overrides: Partial<RealExecutionIntent> = {},
): RealExecutionIntent {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'reservation-plan-1',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: USDT,
    targetAsset: BTCB,
    sourceQuantity: '5',
    maxSlippageRate: '0.001',
    createdAt: new Date('2026-10-01T13:59:59.000Z'),
    ...overrides,
  };
}

function quote(
  overrides: Partial<RealExecutionQuote> = {},
): RealExecutionQuote {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    providerId: 'agentic_wallet',
    providerQuoteId: null,
    intent: intent(),
    expectedTargetQuantity: '0.000062',
    minimumTargetQuantity: '0.000061938',
    costs: [
      { kind: 'provider_fee', asset: USDT, quantity: '0.005' },
      { kind: 'network_fee', asset: USDT, quantity: '0.1' },
    ],
    costCoverage: 'complete',
    quotedAt: new Date('2026-10-01T14:00:01.000Z'),
    expiresAt: new Date('2026-10-01T14:00:06.000Z'),
    executable: false,
    ...overrides,
  };
}

function budgetSnapshot(): RealExecutionBudgetSnapshot {
  return {
    providerId: 'agentic_wallet',
    chainId: '56',
    utcDay: '2026-10-01',
    settledSpendUsdt: '2',
    reservedSpendUsdt: '1',
    spendCoverage: 'complete',
    bankrollValueUsdt: '12',
    bankrollCoverage: 'complete',
    observedAt: new Date('2026-10-01T14:00:00.000Z'),
  };
}

function resourceSnapshot(
  overrides: Partial<RealExecutionResourceSnapshot> = {},
): RealExecutionResourceSnapshot {
  return {
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    sourceTokenAddress: USDT.tokenAddress,
    sourceSymbol: 'USDT',
    sourceAvailableQuantity: '6',
    sourceBalanceCoverage: 'complete',
    nativeGasSymbol: 'BNB',
    nativeGasAvailableQuantity: '0.001',
    nativeGasRequiredQuantity: '0.0002',
    nativeGasCoverage: 'complete',
    observedAt: new Date('2026-10-01T14:00:00.000Z'),
    ...overrides,
  };
}

function quotaSnapshot(
  overrides: Partial<RealExecutionProviderQuotaSnapshot> = {},
): RealExecutionProviderQuotaSnapshot {
  return {
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    utcDay: '2026-10-01',
    dailyLimitUsd: '1000',
    usedUsd: '100',
    remainingUsd: '900',
    quotaCoverage: 'complete',
    requiredUsd: '5.2',
    requirementValuationBasis: 'explicit_external_usd_value',
    requirementCoverage: 'complete',
    quotaObservedAt: new Date('2026-10-01T14:00:00.000Z'),
    requirementValuedAt: new Date('2026-10-01T14:00:01.000Z'),
    ...overrides,
  };
}

function limits(): RealExecutionLocalRiskLimits {
  return {
    maximumOrderNotionalUsdt: '8',
    maximumDailySpendUsdt: '20',
    maximumBankrollUsdt: '25',
    maximumProviderFeeRate: '0.01',
    maximumNetworkFeeUsdt: '0.5',
    maximumSlippageRate: '0.005',
  };
}
