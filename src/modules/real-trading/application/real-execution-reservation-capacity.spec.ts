import {
  RealExecutionAsset,
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { RealExecutionBudgetSnapshot } from './real-execution-budget-risk';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';
import { RealExecutionProviderQuotaSnapshot } from './real-execution-provider-quota-risk';
import {
  assessRealExecutionReservationCapacity,
  RealExecutionActiveReservation,
  RealExecutionReservationCapacitySnapshot,
} from './real-execution-reservation-capacity';
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

describe('assessRealExecutionReservationCapacity', () => {
  it('proves aggregate reservation capacity without reserving or authorizing anything', () => {
    expect(assessment()).toEqual({
      scope: 'real_execution_reservation_capacity',
      status: 'reservation_capacity_available',
      blockers: [],
      reservationPlanStatus: 'reservation_plan_ready',
      activeReservationCount: 1,
      proposedBudgetReservationUsdt: '8.105',
      proposedSourceReservationQuantity: '5.505',
      proposedNativeGasReservationQuantity: '0.0003',
      proposedProviderQuotaReservationUsd: '7.2',
      durableReservationCreated: false,
      atomicEnforcement: false,
      riskApproved: false,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
      evaluatedAt: EVALUATED_AT,
    });
  });

  it('requires the durable active-budget total to match the budget snapshot', () => {
    expect(
      assessment(
        reservationSnapshot(),
        budgetSnapshot({ reservedSpendUsdt: '2.999' }),
      ).blockers,
    ).toEqual(['reserved_budget_mismatch']);
  });

  it('checks aggregate source, gas, and provider quota independently', () => {
    expect(
      assessment(
        reservationSnapshot(),
        budgetSnapshot(),
        resourceSnapshot({
          sourceAvailableQuantity: '5.504999999999999999',
          nativeGasAvailableQuantity: '0.000299999999999999',
        }),
        quotaSnapshot({
          dailyLimitUsd: '107.199999999999999999',
          remainingUsd: '7.199999999999999999',
        }),
      ).blockers,
    ).toEqual([
      'aggregate_source_insufficient',
      'aggregate_native_gas_insufficient',
      'aggregate_provider_quota_insufficient',
    ]);
  });

  it('rejects an already active intent and quote but ignores expired reservations', () => {
    const duplicate = activeReservation({
      intentId: intent().id,
      quoteId: quote().id,
    });
    expect(
      assessment(
        reservationSnapshot({ reservations: [duplicate] }),
        budgetSnapshot({ reservedSpendUsdt: '3' }),
      ).blockers,
    ).toEqual(['intent_already_reserved', 'quote_already_reserved']);

    expect(
      assessment(
        reservationSnapshot({
          reservations: [
            activeReservation({
              intentId: intent().id,
              quoteId: quote().id,
              expiresAt: EVALUATED_AT,
            }),
          ],
        }),
        budgetSnapshot({ reservedSpendUsdt: '0' }),
      ).blockers,
    ).toEqual([]);
  });

  it('keeps the active reservation set bounded before persistence', () => {
    const reservations = Array.from({ length: 100 }, (_, index) =>
      activeReservation({
        id: uuid(index + 10),
        intentId: uuid(index + 110),
        quoteId: uuid(index + 210),
        budgetChargeUsdt: '0.001',
        sourceQuantity: '0.001',
        nativeGasQuantity: '0.000001',
        providerQuotaUsd: '0.001',
      }),
    );
    expect(
      assessment(
        reservationSnapshot({ reservations }),
        budgetSnapshot({ reservedSpendUsdt: '0.1' }),
      ).blockers,
    ).toEqual(['maximum_active_reservations_reached']);
  });

  it('fails closed for divergent, partial, future, stale, or malformed snapshots', () => {
    expect(
      assessment(
        reservationSnapshot({
          providerId: 'other_provider',
          chainId: '1',
          utcDay: '2026-09-30',
          coverage: 'partial',
          observedAt: new Date('2026-10-01T14:00:02.001Z'),
        }),
      ).blockers,
    ).toEqual([
      'reservation_provider_mismatch',
      'reservation_chain_mismatch',
      'reservation_day_mismatch',
      'reservation_observation_day_mismatch',
      'reservation_snapshot_from_future',
      'reservation_coverage_incomplete',
    ]);
    expect(
      assessment(
        reservationSnapshot({
          observedAt: new Date('2026-10-01T13:59:56.999Z'),
        }),
      ).blockers,
    ).toContain('reservation_snapshot_stale');
    expect(
      assessment(
        reservationSnapshot({
          reservations: [activeReservation({ budgetChargeUsdt: '01' })],
        }),
      ).blockers,
    ).toEqual(['invalid_reservation_snapshot']);
  });

  it('produces no aggregate proposal when the upstream plan is blocked', () => {
    const result = assessment(
      reservationSnapshot(),
      budgetSnapshot(),
      resourceSnapshot(),
      quotaSnapshot({ remainingUsd: '5.199', usedUsd: '994.801' }),
    );
    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['reservation_plan_blocked'],
      reservationPlanStatus: 'blocked',
      proposedBudgetReservationUsdt: null,
      proposedSourceReservationQuantity: null,
      durableReservationCreated: false,
    });
  });

  it('rejects a missing or out-of-range reservation freshness policy', () => {
    expect(() => runWithFreshness({} as never)).toThrow(
      'reservation snapshot maximum age must be between 1 and 60000 ms',
    );
    expect(() =>
      runWithFreshness({
        ...freshness(),
        reservationSnapshotMaxAgeMs: 60_001,
      }),
    ).toThrow(
      'reservation snapshot maximum age must be between 1 and 60000 ms',
    );
  });
});

function assessment(
  valueReservationSnapshot = reservationSnapshot(),
  valueBudgetSnapshot = budgetSnapshot(),
  valueResourceSnapshot = resourceSnapshot(),
  valueQuotaSnapshot = quotaSnapshot(),
) {
  return assessRealExecutionReservationCapacity(
    intent(),
    quote(),
    limits(),
    valueBudgetSnapshot,
    valueResourceSnapshot,
    valueQuotaSnapshot,
    valueReservationSnapshot,
    freshness(),
    EVALUATED_AT,
  );
}

function runWithFreshness(valueFreshness: ReturnType<typeof freshness>) {
  return assessRealExecutionReservationCapacity(
    intent(),
    quote(),
    limits(),
    budgetSnapshot(),
    resourceSnapshot(),
    quotaSnapshot(),
    reservationSnapshot(),
    valueFreshness,
    EVALUATED_AT,
  );
}

function reservationSnapshot(
  overrides: Partial<RealExecutionReservationCapacitySnapshot> = {},
): RealExecutionReservationCapacitySnapshot {
  return {
    providerId: 'agentic_wallet',
    chainId: '56',
    utcDay: '2026-10-01',
    reservations: [activeReservation()],
    coverage: 'complete',
    observedAt: new Date('2026-10-01T14:00:01.000Z'),
    ...overrides,
  };
}

function activeReservation(
  overrides: Partial<RealExecutionActiveReservation> = {},
): RealExecutionActiveReservation {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    intentId: '44444444-4444-4444-8444-444444444444',
    quoteId: '55555555-5555-4555-8555-555555555555',
    budgetChargeUsdt: '3',
    sourceTokenAddress: USDT.tokenAddress,
    sourceQuantity: '0.5',
    nativeGasQuantity: '0.0001',
    providerQuotaUsd: '2',
    expiresAt: new Date('2026-10-01T14:00:05.000Z'),
    ...overrides,
  };
}

function uuid(value: number): string {
  return `${value.toString(16).padStart(8, '0')}-0000-4000-8000-${value
    .toString(16)
    .padStart(12, '0')}`;
}

function freshness() {
  return {
    budgetSnapshotMaxAgeMs: 5000,
    resourceSnapshotMaxAgeMs: 5000,
    quotaSnapshotMaxAgeMs: 5000,
    requirementValuationMaxAgeMs: 5000,
    reservationSnapshotMaxAgeMs: 5000,
  };
}

function intent(): RealExecutionIntent {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'reservation-capacity-1',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: USDT,
    targetAsset: BTCB,
    sourceQuantity: '5',
    maxSlippageRate: '0.001',
    createdAt: new Date('2026-10-01T13:59:59.000Z'),
  };
}

function quote(): RealExecutionQuote {
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
  };
}

function budgetSnapshot(
  overrides: Partial<RealExecutionBudgetSnapshot> = {},
): RealExecutionBudgetSnapshot {
  return {
    providerId: 'agentic_wallet',
    chainId: '56',
    utcDay: '2026-10-01',
    settledSpendUsdt: '2',
    reservedSpendUsdt: '3',
    spendCoverage: 'complete',
    bankrollValueUsdt: '12',
    bankrollCoverage: 'complete',
    observedAt: new Date('2026-10-01T14:00:00.000Z'),
    ...overrides,
  };
}

function resourceSnapshot(
  overrides: Partial<RealExecutionResourceSnapshot> = {},
): RealExecutionResourceSnapshot {
  return {
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: intent().id,
    quoteId: quote().id,
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
    intentId: intent().id,
    quoteId: quote().id,
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
