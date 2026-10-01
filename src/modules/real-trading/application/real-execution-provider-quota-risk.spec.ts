import {
  RealExecutionAsset,
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { RealExecutionBudgetSnapshot } from './real-execution-budget-risk';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';
import {
  assessRealExecutionProviderQuotaRisk,
  RealExecutionProviderQuotaRiskBlocker,
  RealExecutionProviderQuotaSnapshot,
} from './real-execution-provider-quota-risk';
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

describe('assessRealExecutionProviderQuotaRisk', () => {
  it('proves explicit USD quota sufficiency without assuming USDT parity or authorizing anything', () => {
    expect(assessment()).toEqual({
      scope: 'real_execution_provider_quota_risk',
      status: 'provider_quota_sufficient',
      blockers: [],
      resourceRiskStatus: 'resources_sufficient',
      requiredProviderQuotaUsd: '5.2',
      remainingProviderQuotaUsd: '900',
      providerQuotaSufficient: true,
      usdtUsdParityAssumed: false,
      providerDailyLimitAcceptedAsProjectRiskLimit: false,
      durableQuotaReservation: false,
      riskApproved: false,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
      evaluatedAt: EVALUATED_AT,
    });
  });

  it('accepts the exact remaining-quota boundary', () => {
    expect(
      blockers(
        quotaSnapshot({
          dailyLimitUsd: '105.2',
          usedUsd: '100',
          remainingUsd: '5.2',
        }),
      ),
    ).toEqual([]);
  });

  it('rejects divergent provider, chain, intent, quote, and UTC-day identities', () => {
    expect(
      blockers(
        quotaSnapshot({
          providerId: 'other_provider',
          chainId: '1',
          intentId: '33333333-3333-4333-8333-333333333333',
          quoteId: '44444444-4444-4444-8444-444444444444',
          utcDay: '2026-09-30',
        }),
      ),
    ).toEqual([
      'quota_provider_mismatch',
      'quota_chain_mismatch',
      'quota_intent_mismatch',
      'quota_quote_mismatch',
      'quota_day_mismatch',
      'quota_observation_day_mismatch',
    ]);
  });

  it('checks quota and valuation freshness independently', () => {
    expect(
      blockers(
        quotaSnapshot({
          quotaObservedAt: new Date('2026-10-01T14:00:02.001Z'),
          requirementValuedAt: new Date('2026-10-01T13:59:56.999Z'),
        }),
      ),
    ).toEqual(['quota_observation_from_future', 'requirement_valuation_stale']);
  });

  it('requires the quota observation to belong to its declared UTC day', () => {
    expect(
      blockers(
        quotaSnapshot({
          quotaObservedAt: new Date('2026-09-30T23:59:59.999Z'),
        }),
      ),
    ).toEqual(['quota_observation_day_mismatch', 'quota_observation_stale']);
  });

  it('requires complete quota and explicit USD valuation coverage', () => {
    expect(
      blockers(
        quotaSnapshot({
          quotaCoverage: 'partial',
          requirementCoverage: 'partial',
        }),
      ),
    ).toEqual(['quota_coverage_incomplete', 'requirement_coverage_incomplete']);
  });

  it('reconciles used plus remaining quota against the provider limit exactly', () => {
    expect(
      blockers(
        quotaSnapshot({
          dailyLimitUsd: '1000',
          usedUsd: '1000.000000000000000001',
          remainingUsd: '900',
        }),
      ),
    ).toEqual(['quota_used_exceeds_daily_limit', 'quota_total_mismatch']);
  });

  it('rejects insufficient provider quota independently', () => {
    expect(
      blockers(
        quotaSnapshot({
          dailyLimitUsd: '105.199999999999999999',
          usedUsd: '100',
          remainingUsd: '5.199999999999999999',
        }),
      ),
    ).toEqual(['provider_quota_insufficient']);
  });

  it('fails closed when the resource assessment is blocked', () => {
    const result = assessment(
      quotaSnapshot(),
      quote({ costCoverage: 'partial', costs: [] }),
    );

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['resource_risk_blocked'],
      resourceRiskStatus: 'blocked',
      providerQuotaSufficient: true,
      riskApproved: false,
    });
  });

  it('rejects malformed quota facts and freshness policies', () => {
    expect(
      blockers(
        quotaSnapshot({
          utcDay: '2026-02-30',
          requiredUsd: '0',
        }),
      ),
    ).toEqual(['invalid_provider_quota_snapshot']);
    expect(() =>
      assessRealExecutionProviderQuotaRisk(
        intent(),
        quote(),
        limits(),
        budgetSnapshot(),
        resourceSnapshot(),
        quotaSnapshot(),
        freshness({ quotaSnapshotMaxAgeMs: 60_001 }),
        EVALUATED_AT,
      ),
    ).toThrow('maximum ages must be between 1 and 60000 ms');
    expect(() =>
      assessRealExecutionProviderQuotaRisk(
        intent(),
        quote(),
        limits(),
        budgetSnapshot(),
        resourceSnapshot(),
        quotaSnapshot(),
        {} as never,
        EVALUATED_AT,
      ),
    ).toThrow('maximum ages must be between 1 and 60000 ms');
    expect(() =>
      assessRealExecutionProviderQuotaRisk(
        intent(),
        quote(),
        limits(),
        budgetSnapshot(),
        resourceSnapshot(),
        quotaSnapshot(),
        freshness(),
        new Date('invalid'),
      ),
    ).toThrow('provider quota risk evaluation time must be valid');
  });
});

function blockers(
  snapshot: RealExecutionProviderQuotaSnapshot,
): readonly RealExecutionProviderQuotaRiskBlocker[] {
  return assessment(snapshot).blockers;
}

function assessment(
  valueQuotaSnapshot = quotaSnapshot(),
  valueQuote = quote(),
) {
  return assessRealExecutionProviderQuotaRisk(
    intent(),
    valueQuote,
    limits(),
    budgetSnapshot(),
    resourceSnapshot(),
    valueQuotaSnapshot,
    freshness(),
    EVALUATED_AT,
  );
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

function freshness(
  overrides: Partial<{
    budgetSnapshotMaxAgeMs: number;
    resourceSnapshotMaxAgeMs: number;
    quotaSnapshotMaxAgeMs: number;
    requirementValuationMaxAgeMs: number;
  }> = {},
) {
  return {
    budgetSnapshotMaxAgeMs: 5000,
    resourceSnapshotMaxAgeMs: 5000,
    quotaSnapshotMaxAgeMs: 5000,
    requirementValuationMaxAgeMs: 5000,
    ...overrides,
  };
}

function resourceSnapshot(): RealExecutionResourceSnapshot {
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

function intent(): RealExecutionIntent {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'provider-quota-risk-1',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: USDT,
    targetAsset: BTCB,
    sourceQuantity: '5',
    maxSlippageRate: '0.005',
    createdAt: new Date('2026-10-01T13:59:59.000Z'),
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
    minimumTargetQuantity: '0.00006169',
    costs: [
      { kind: 'provider_fee', asset: USDT, quantity: '0.01' },
      { kind: 'network_fee', asset: USDT, quantity: '0.1' },
    ],
    costCoverage: 'complete',
    quotedAt: new Date('2026-10-01T14:00:01.000Z'),
    expiresAt: new Date('2026-10-01T14:00:06.000Z'),
    executable: false,
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
