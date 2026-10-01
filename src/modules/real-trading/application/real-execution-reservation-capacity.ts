import Decimal from 'decimal.js';

import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { RealExecutionBudgetSnapshot } from './real-execution-budget-risk';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';
import {
  RealExecutionProviderQuotaFreshnessPolicy,
  RealExecutionProviderQuotaSnapshot,
} from './real-execution-provider-quota-risk';
import {
  planRealExecutionReservation,
  RealExecutionReservationPlanAssessment,
} from './real-execution-reservation-plan';
import { RealExecutionResourceSnapshot } from './real-execution-resource-risk';

const ExactDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PROVIDER_ID_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;
const CHAIN_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const UTC_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TOKEN_ADDRESS_PATTERN = /^\S{1,256}$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;
const MAXIMUM_ACTIVE_RESERVATIONS = 100;
const MAXIMUM_RESERVATION_SNAPSHOT_AGE_MS = 60_000;

export interface RealExecutionActiveReservation {
  readonly id: string;
  readonly intentId: string;
  readonly quoteId: string;
  readonly budgetChargeUsdt: string;
  readonly sourceTokenAddress: string;
  readonly sourceQuantity: string;
  readonly nativeGasQuantity: string;
  readonly providerQuotaUsd: string;
  readonly expiresAt: Date;
}

export interface RealExecutionReservationCapacitySnapshot {
  readonly providerId: string;
  readonly chainId: string;
  readonly utcDay: string;
  readonly reservations: readonly RealExecutionActiveReservation[];
  readonly coverage: 'complete' | 'partial';
  readonly observedAt: Date;
}

export interface RealExecutionReservationCapacityFreshnessPolicy extends RealExecutionProviderQuotaFreshnessPolicy {
  readonly reservationSnapshotMaxAgeMs: number;
}

export type RealExecutionReservationCapacityBlocker =
  | 'reservation_plan_blocked'
  | 'invalid_reservation_snapshot'
  | 'reservation_provider_mismatch'
  | 'reservation_chain_mismatch'
  | 'reservation_day_mismatch'
  | 'reservation_observation_day_mismatch'
  | 'reservation_snapshot_from_future'
  | 'reservation_snapshot_stale'
  | 'reservation_coverage_incomplete'
  | 'maximum_active_reservations_reached'
  | 'intent_already_reserved'
  | 'quote_already_reserved'
  | 'reserved_budget_mismatch'
  | 'aggregate_source_insufficient'
  | 'aggregate_native_gas_insufficient'
  | 'aggregate_provider_quota_insufficient';

export interface RealExecutionReservationCapacityAssessment {
  readonly scope: 'real_execution_reservation_capacity';
  readonly status: 'reservation_capacity_available' | 'blocked';
  readonly blockers: readonly RealExecutionReservationCapacityBlocker[];
  readonly reservationPlanStatus: RealExecutionReservationPlanAssessment['status'];
  readonly activeReservationCount: number | null;
  readonly proposedBudgetReservationUsdt: string | null;
  readonly proposedSourceReservationQuantity: string | null;
  readonly proposedNativeGasReservationQuantity: string | null;
  readonly proposedProviderQuotaReservationUsd: string | null;
  readonly durableReservationCreated: false;
  readonly atomicEnforcement: false;
  readonly riskApproved: false;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function assessRealExecutionReservationCapacity(
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
  limits: RealExecutionLocalRiskLimits,
  budgetSnapshot: RealExecutionBudgetSnapshot,
  resourceSnapshot: RealExecutionResourceSnapshot,
  quotaSnapshot: RealExecutionProviderQuotaSnapshot,
  reservationSnapshot: RealExecutionReservationCapacitySnapshot,
  freshness: RealExecutionReservationCapacityFreshnessPolicy,
  evaluatedAt: Date,
): RealExecutionReservationCapacityAssessment {
  validateFreshnessPolicy(freshness);
  const reservationPlan = planRealExecutionReservation(
    intent,
    quote,
    limits,
    budgetSnapshot,
    resourceSnapshot,
    quotaSnapshot,
    freshness,
    evaluatedAt,
  );
  const blockers: RealExecutionReservationCapacityBlocker[] = [];
  addIf(
    blockers,
    reservationPlan.status !== 'reservation_plan_ready',
    'reservation_plan_blocked',
  );

  const snapshotValid = isValidReservationSnapshot(reservationSnapshot);
  addIf(blockers, !snapshotValid, 'invalid_reservation_snapshot');

  let activeReservationCount: number | null = null;
  let proposedBudgetReservationUsdt: string | null = null;
  let proposedSourceReservationQuantity: string | null = null;
  let proposedNativeGasReservationQuantity: string | null = null;
  let proposedProviderQuotaReservationUsd: string | null = null;
  if (snapshotValid) {
    const active = reservationSnapshot.reservations.filter(
      (reservation) => reservation.expiresAt.getTime() > evaluatedAt.getTime(),
    );
    activeReservationCount = active.length;
    addIf(
      blockers,
      active.length >= MAXIMUM_ACTIVE_RESERVATIONS,
      'maximum_active_reservations_reached',
    );
    addIf(
      blockers,
      active.some((reservation) => reservation.intentId === intent.id),
      'intent_already_reserved',
    );
    addIf(
      blockers,
      active.some((reservation) => reservation.quoteId === quote.id),
      'quote_already_reserved',
    );
    addIf(
      blockers,
      reservationSnapshot.providerId !== quote.providerId,
      'reservation_provider_mismatch',
    );
    addIf(
      blockers,
      reservationSnapshot.chainId !== intent.chainId,
      'reservation_chain_mismatch',
    );
    addIf(
      blockers,
      reservationSnapshot.utcDay !== utcDay(evaluatedAt),
      'reservation_day_mismatch',
    );
    addIf(
      blockers,
      reservationSnapshot.utcDay !== utcDay(reservationSnapshot.observedAt),
      'reservation_observation_day_mismatch',
    );
    const ageMs =
      evaluatedAt.getTime() - reservationSnapshot.observedAt.getTime();
    addIf(blockers, ageMs < 0, 'reservation_snapshot_from_future');
    addIf(
      blockers,
      ageMs > freshness.reservationSnapshotMaxAgeMs,
      'reservation_snapshot_stale',
    );
    addIf(
      blockers,
      reservationSnapshot.coverage !== 'complete',
      'reservation_coverage_incomplete',
    );

    if (reservationPlan.plan !== null) {
      const activeBudget = sum(active, 'budgetChargeUsdt');
      addIf(
        blockers,
        !activeBudget.equals(budgetSnapshot.reservedSpendUsdt),
        'reserved_budget_mismatch',
      );
      proposedBudgetReservationUsdt = activeBudget
        .plus(reservationPlan.plan.budgetChargeUsdt)
        .toFixed();

      const activeSource = active.filter(
        (reservation) =>
          reservation.sourceTokenAddress.toLowerCase() ===
          reservationPlan.plan!.sourceTokenAddress,
      );
      proposedSourceReservationQuantity = sum(activeSource, 'sourceQuantity')
        .plus(reservationPlan.plan.sourceQuantity)
        .toFixed();
      proposedNativeGasReservationQuantity = sum(active, 'nativeGasQuantity')
        .plus(reservationPlan.plan.nativeGasQuantity)
        .toFixed();
      proposedProviderQuotaReservationUsd = sum(active, 'providerQuotaUsd')
        .plus(reservationPlan.plan.providerQuotaUsd)
        .toFixed();

      addIf(
        blockers,
        new ExactDecimal(proposedSourceReservationQuantity).greaterThan(
          resourceSnapshot.sourceAvailableQuantity,
        ),
        'aggregate_source_insufficient',
      );
      addIf(
        blockers,
        new ExactDecimal(proposedNativeGasReservationQuantity).greaterThan(
          resourceSnapshot.nativeGasAvailableQuantity,
        ),
        'aggregate_native_gas_insufficient',
      );
      addIf(
        blockers,
        new ExactDecimal(proposedProviderQuotaReservationUsd).greaterThan(
          quotaSnapshot.remainingUsd,
        ),
        'aggregate_provider_quota_insufficient',
      );
    }
  }

  return {
    scope: 'real_execution_reservation_capacity',
    status:
      blockers.length === 0 ? 'reservation_capacity_available' : 'blocked',
    blockers,
    reservationPlanStatus: reservationPlan.status,
    activeReservationCount,
    proposedBudgetReservationUsdt,
    proposedSourceReservationQuantity,
    proposedNativeGasReservationQuantity,
    proposedProviderQuotaReservationUsd,
    durableReservationCreated: false,
    atomicEnforcement: false,
    riskApproved: false,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function isValidReservationSnapshot(
  snapshot: RealExecutionReservationCapacitySnapshot,
): boolean {
  const reservations: unknown = snapshot?.reservations;
  if (
    typeof snapshot !== 'object' ||
    snapshot === null ||
    typeof snapshot.providerId !== 'string' ||
    !PROVIDER_ID_PATTERN.test(snapshot.providerId) ||
    typeof snapshot.chainId !== 'string' ||
    !CHAIN_ID_PATTERN.test(snapshot.chainId) ||
    typeof snapshot.utcDay !== 'string' ||
    !isCanonicalUtcDay(snapshot.utcDay) ||
    !Array.isArray(reservations) ||
    reservations.length > MAXIMUM_ACTIVE_RESERVATIONS ||
    (snapshot.coverage !== 'complete' && snapshot.coverage !== 'partial') ||
    !(snapshot.observedAt instanceof Date) ||
    !Number.isFinite(snapshot.observedAt.getTime())
  ) {
    return false;
  }
  const ids = new Set<string>();
  const intentIds = new Set<string>();
  const quoteIds = new Set<string>();
  for (const value of reservations as readonly unknown[]) {
    if (
      !isValidActiveReservation(value) ||
      ids.has(value.id) ||
      intentIds.has(value.intentId) ||
      quoteIds.has(value.quoteId)
    ) {
      return false;
    }
    ids.add(value.id);
    intentIds.add(value.intentId);
    quoteIds.add(value.quoteId);
  }
  return true;
}

function isValidActiveReservation(
  value: unknown,
): value is RealExecutionActiveReservation {
  if (typeof value !== 'object' || value === null) return false;
  const reservation = value as Record<string, unknown>;
  return (
    typeof reservation.id === 'string' &&
    UUID_PATTERN.test(reservation.id) &&
    typeof reservation.intentId === 'string' &&
    UUID_PATTERN.test(reservation.intentId) &&
    typeof reservation.quoteId === 'string' &&
    UUID_PATTERN.test(reservation.quoteId) &&
    typeof reservation.budgetChargeUsdt === 'string' &&
    POSITIVE_DECIMAL_PATTERN.test(reservation.budgetChargeUsdt) &&
    typeof reservation.sourceTokenAddress === 'string' &&
    TOKEN_ADDRESS_PATTERN.test(reservation.sourceTokenAddress) &&
    typeof reservation.sourceQuantity === 'string' &&
    POSITIVE_DECIMAL_PATTERN.test(reservation.sourceQuantity) &&
    typeof reservation.nativeGasQuantity === 'string' &&
    POSITIVE_DECIMAL_PATTERN.test(reservation.nativeGasQuantity) &&
    typeof reservation.providerQuotaUsd === 'string' &&
    POSITIVE_DECIMAL_PATTERN.test(reservation.providerQuotaUsd) &&
    reservation.expiresAt instanceof Date &&
    Number.isFinite(reservation.expiresAt.getTime())
  );
}

function sum<T extends RealExecutionActiveReservation>(
  reservations: readonly T[],
  field:
    | 'budgetChargeUsdt'
    | 'sourceQuantity'
    | 'nativeGasQuantity'
    | 'providerQuotaUsd',
): Decimal {
  return reservations.reduce(
    (total, reservation) => total.plus(reservation[field]),
    new ExactDecimal(0),
  );
}

function validateFreshnessPolicy(
  freshness: RealExecutionReservationCapacityFreshnessPolicy,
): void {
  if (
    typeof freshness !== 'object' ||
    freshness === null ||
    !validMaximumAge(freshness.reservationSnapshotMaxAgeMs)
  ) {
    throw new Error(
      'Real execution reservation snapshot maximum age must be between 1 and 60000 ms',
    );
  }
}

function validMaximumAge(value: number): boolean {
  return (
    Number.isInteger(value) &&
    value > 0 &&
    value <= MAXIMUM_RESERVATION_SNAPSHOT_AGE_MS
  );
}

function isCanonicalUtcDay(value: string): boolean {
  if (!UTC_DAY_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && utcDay(parsed) === value;
}

function utcDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addIf(
  blockers: RealExecutionReservationCapacityBlocker[],
  condition: boolean,
  blocker: RealExecutionReservationCapacityBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
