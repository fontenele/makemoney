import {
  RealExecutionAsset,
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { StoredRealExecutionArm } from './real-execution-arm-store';
import { RealExecutionBudgetSnapshot } from './real-execution-budget-risk';
import { RealExecutionEmergencyStopSnapshot } from './real-execution-emergency-stop-assessment';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';
import { RealExecutionProviderQuotaSnapshot } from './real-execution-provider-quota-risk';
import {
  RealExecutionActiveReservation,
  RealExecutionReservationCapacitySnapshot,
} from './real-execution-reservation-capacity';
import { StoredRealExecutionReservation } from './real-execution-reservation-store';
import { RealExecutionResourceSnapshot } from './real-execution-resource-risk';
import {
  revalidateRealExecutionRisk,
  RealExecutionRiskRevalidationPolicy,
} from './real-execution-risk-revalidation';

const NOW = new Date('2026-10-01T14:00:05.000Z');
const BTCB: RealExecutionAsset = {
  tokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
  symbol: 'BTCB',
};
const USDT: RealExecutionAsset = {
  tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
  symbol: 'USDT',
};

describe('revalidateRealExecutionRisk', () => {
  it('revalidates the exact reservation and arm without approving risk', () => {
    expect(run()).toEqual({
      scope: 'real_execution_risk_revalidation',
      status: 'risk_revalidation_ready',
      blockers: [],
      reservationCapacityStatus: 'reservation_capacity_available',
      emergencyStopStatus: 'emergency_stop_clear_for_arm',
      plan: {
        reservationId: '33333333-3333-4333-8333-333333333333',
        armId: '55555555-5555-4555-8555-555555555555',
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: '11111111-1111-4111-8111-111111111111',
        quoteId: '22222222-2222-4222-8222-222222222222',
        emergencyStopChangeId: 'real-trading-stop-clear-1',
        revalidatedAt: NOW,
        expiresAt: new Date('2026-10-01T14:00:07.000Z'),
      },
      currentReservationExcludedBeforeRevalidation: true,
      atomicEnforcement: false,
      riskApproved: false,
      confirmationRecorded: false,
      submissionAuthorized: false,
      evaluatedAt: NOW,
    });
  });

  it('excludes only the current reservation before recomputing capacity', () => {
    const result = run();

    expect(result.status).toBe('risk_revalidation_ready');
    expect(result.currentReservationExcludedBeforeRevalidation).toBe(true);
    expect(result.reservationCapacityStatus).toBe(
      'reservation_capacity_available',
    );
  });

  it('requires the exact durable reservation in the complete snapshot', () => {
    expect(
      run({
        reservationSnapshot: reservationSnapshot({
          reservations: [otherReservation()],
        }),
        budgetSnapshot: budgetSnapshot({ reservedSpendUsdt: '3' }),
      }).blockers,
    ).toContain('reservation_missing_from_snapshot');

    expect(
      run({
        reservationSnapshot: reservationSnapshot({
          reservations: [
            activeReservation({ sourceQuantity: '5.006' }),
            otherReservation(),
          ],
        }),
      }).blockers,
    ).toContain('reservation_snapshot_record_mismatch');
  });

  it('fails closed when durable reserved spend cannot exclude itself', () => {
    const result = run({
      budgetSnapshot: budgetSnapshot({ reservedSpendUsdt: '5' }),
    });

    expect(result.blockers).toEqual(
      expect.arrayContaining([
        'reserved_spend_below_reservation',
        'reservation_capacity_revalidation_blocked',
      ]),
    );
    expect(result.currentReservationExcludedBeforeRevalidation).toBe(false);
  });

  it('detects changed financial facts even when the stored row is self-consistent', () => {
    const changedReservation = reservation({ budgetChargeUsdt: '5.106' });
    const result = run({
      reservation: changedReservation,
      reservationSnapshot: reservationSnapshot({
        reservations: [
          activeReservation({ budgetChargeUsdt: '5.106' }),
          otherReservation(),
        ],
      }),
      budgetSnapshot: budgetSnapshot({ reservedSpendUsdt: '8.106' }),
    });

    expect(result.blockers).toContain('reservation_facts_changed');
    expect(result.plan).toBeNull();
  });

  it('blocks when current aggregate resources no longer cover reservations', () => {
    const result = run({
      resourceSnapshot: resourceSnapshot({
        sourceAvailableQuantity: '5.504',
      }),
    });

    expect(result.blockers).toContain(
      'reservation_capacity_revalidation_blocked',
    );
    expect(result.reservationCapacityStatus).toBe('blocked');
  });

  it('requires the arm to match the revalidated reservation exactly', () => {
    expect(
      run({
        arm: arm({ reservationId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }),
      }).blockers,
    ).toContain('arm_identity_mismatch');
  });

  it('recomposes M10.21 and blocks an active emergency stop', () => {
    const result = run({
      emergencyStopSnapshot: emergencyStopSnapshot({ active: true }),
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['emergency_stop_blocked'],
      emergencyStopStatus: 'blocked',
      riskApproved: false,
      confirmationRecorded: false,
      submissionAuthorized: false,
    });
  });

  it('blocks expired durable artifacts and invalid policy bounds', () => {
    expect(
      run({ reservation: reservation({ expiresAt: NOW }) }).blockers,
    ).toEqual(expect.arrayContaining(['reservation_expired']));
    expect(() =>
      run({ policy: { ...policy(), emergencyStopSnapshotMaxAgeMs: 60_001 } }),
    ).toThrow(RangeError);
  });
});

interface Overrides {
  readonly budgetSnapshot?: RealExecutionBudgetSnapshot;
  readonly resourceSnapshot?: RealExecutionResourceSnapshot;
  readonly reservationSnapshot?: RealExecutionReservationCapacitySnapshot;
  readonly reservation?: StoredRealExecutionReservation;
  readonly arm?: StoredRealExecutionArm;
  readonly emergencyStopSnapshot?: RealExecutionEmergencyStopSnapshot;
  readonly policy?: RealExecutionRiskRevalidationPolicy;
}

function run(overrides: Overrides = {}) {
  return revalidateRealExecutionRisk(
    intent(),
    quote(),
    limits(),
    overrides.budgetSnapshot ?? budgetSnapshot(),
    overrides.resourceSnapshot ?? resourceSnapshot(),
    quotaSnapshot(),
    overrides.reservationSnapshot ?? reservationSnapshot(),
    overrides.reservation ?? reservation(),
    overrides.arm ?? arm(),
    overrides.emergencyStopSnapshot ?? emergencyStopSnapshot(),
    overrides.policy ?? policy(),
    NOW,
  );
}

function policy(): RealExecutionRiskRevalidationPolicy {
  return {
    budgetSnapshotMaxAgeMs: 5_000,
    resourceSnapshotMaxAgeMs: 5_000,
    quotaSnapshotMaxAgeMs: 5_000,
    requirementValuationMaxAgeMs: 5_000,
    reservationSnapshotMaxAgeMs: 5_000,
    emergencyStopSnapshotMaxAgeMs: 5_000,
  };
}

function intent(): RealExecutionIntent {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'risk-revalidation-1',
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
    expiresAt: new Date('2026-10-01T14:00:08.000Z'),
    executable: false,
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

function budgetSnapshot(
  overrides: Partial<RealExecutionBudgetSnapshot> = {},
): RealExecutionBudgetSnapshot {
  return {
    providerId: 'agentic_wallet',
    chainId: '56',
    utcDay: '2026-10-01',
    settledSpendUsdt: '2',
    reservedSpendUsdt: '8.105',
    spendCoverage: 'complete',
    bankrollValueUsdt: '12',
    bankrollCoverage: 'complete',
    observedAt: new Date('2026-10-01T14:00:04.000Z'),
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
    observedAt: new Date('2026-10-01T14:00:04.000Z'),
    ...overrides,
  };
}

function quotaSnapshot(): RealExecutionProviderQuotaSnapshot {
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
    quotaObservedAt: new Date('2026-10-01T14:00:04.000Z'),
    requirementValuedAt: new Date('2026-10-01T14:00:04.000Z'),
  };
}

function reservation(
  overrides: Partial<StoredRealExecutionReservation> = {},
): StoredRealExecutionReservation {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: intent().id,
    quoteId: quote().id,
    idempotencyKey: intent().idempotencyKey,
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'a'.repeat(64),
    utcDay: '2026-10-01',
    budgetChargeUsdt: '5.105',
    sourceTokenAddress: USDT.tokenAddress,
    sourceSymbol: 'USDT',
    sourceQuantity: '5.005',
    nativeGasSymbol: 'BNB',
    nativeGasQuantity: '0.0002',
    providerQuotaUsd: '5.2',
    createdAt: new Date('2026-10-01T14:00:02.000Z'),
    expiresAt: new Date('2026-10-01T14:00:08.000Z'),
    ...overrides,
  };
}

function activeReservation(
  overrides: Partial<RealExecutionActiveReservation> = {},
): RealExecutionActiveReservation {
  const stored = reservation();
  return {
    id: stored.id,
    intentId: stored.intentId,
    quoteId: stored.quoteId,
    budgetChargeUsdt: stored.budgetChargeUsdt,
    sourceTokenAddress: stored.sourceTokenAddress,
    sourceQuantity: stored.sourceQuantity,
    nativeGasQuantity: stored.nativeGasQuantity,
    providerQuotaUsd: stored.providerQuotaUsd,
    expiresAt: stored.expiresAt,
    ...overrides,
  };
}

function otherReservation(): RealExecutionActiveReservation {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    intentId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    quoteId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    budgetChargeUsdt: '3',
    sourceTokenAddress: USDT.tokenAddress,
    sourceQuantity: '0.5',
    nativeGasQuantity: '0.0001',
    providerQuotaUsd: '2',
    expiresAt: new Date('2026-10-01T14:00:09.000Z'),
  };
}

function reservationSnapshot(
  overrides: Partial<RealExecutionReservationCapacitySnapshot> = {},
): RealExecutionReservationCapacitySnapshot {
  return {
    providerId: 'agentic_wallet',
    chainId: '56',
    utcDay: '2026-10-01',
    reservations: [activeReservation(), otherReservation()],
    coverage: 'complete',
    observedAt: new Date('2026-10-01T14:00:04.000Z'),
    ...overrides,
  };
}

function arm(
  overrides: Partial<StoredRealExecutionArm> = {},
): StoredRealExecutionArm {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    reservationId: reservation().id,
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: intent().id,
    quoteId: quote().id,
    acknowledgment: 'reservation_and_quote_reviewed',
    requestedAt: new Date('2026-10-01T14:00:03.000Z'),
    createdAt: new Date('2026-10-01T14:00:04.000Z'),
    expiresAt: new Date('2026-10-01T14:00:07.000Z'),
    ...overrides,
  };
}

function emergencyStopSnapshot(
  overrides: Partial<RealExecutionEmergencyStopSnapshot> = {},
): RealExecutionEmergencyStopSnapshot {
  return {
    active: false,
    source: 'persisted',
    changeId: 'real-trading-stop-clear-1',
    changedAt: new Date('2026-10-01T13:59:00.000Z'),
    coverage: 'complete',
    observedAt: NOW,
    ...overrides,
  };
}
