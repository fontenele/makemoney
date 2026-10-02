import Decimal from 'decimal.js';

import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { StoredRealExecutionArm } from './real-execution-arm-store';
import { RealExecutionBudgetSnapshot } from './real-execution-budget-risk';
import {
  assessRealExecutionEmergencyStop,
  RealExecutionEmergencyStopFreshnessPolicy,
  RealExecutionEmergencyStopSnapshot,
} from './real-execution-emergency-stop-assessment';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';
import { RealExecutionProviderQuotaSnapshot } from './real-execution-provider-quota-risk';
import {
  assessRealExecutionReservationCapacity,
  RealExecutionActiveReservation,
  RealExecutionReservationCapacityFreshnessPolicy,
  RealExecutionReservationCapacitySnapshot,
} from './real-execution-reservation-capacity';
import { planRealExecutionReservation } from './real-execution-reservation-plan';
import { StoredRealExecutionReservation } from './real-execution-reservation-store';
import { RealExecutionResourceSnapshot } from './real-execution-resource-risk';

const ExactDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UTC_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;
const NON_NEGATIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const IDEMPOTENCY_KEY_PATTERN = /^[\x21-\x7e]{1,128}$/;
const AGENTIC_WALLET_PROVIDER_ID = 'agentic_wallet';
const BSC_CHAIN_ID = '56';
const BSC_USDT_ADDRESS = '0x55d398326f99059ff775485246999027b3197955';
const BSC_BTCB_ADDRESS = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';

export interface RealExecutionRiskRevalidationPolicy extends RealExecutionReservationCapacityFreshnessPolicy {
  readonly emergencyStopSnapshotMaxAgeMs: RealExecutionEmergencyStopFreshnessPolicy['snapshotMaxAgeMs'];
}

export interface RealExecutionRiskApprovalPlan {
  readonly reservationId: string;
  readonly armId: string;
  readonly providerId: string;
  readonly chainId: string;
  readonly intentId: string;
  readonly quoteId: string;
  readonly emergencyStopChangeId: string;
  readonly revalidatedAt: Date;
  readonly expiresAt: Date;
}

export type RealExecutionRiskRevalidationBlocker =
  | 'invalid_stored_reservation'
  | 'reservation_from_future'
  | 'reservation_expired'
  | 'reservation_missing_from_snapshot'
  | 'reservation_snapshot_record_mismatch'
  | 'reserved_spend_below_reservation'
  | 'reservation_capacity_revalidation_blocked'
  | 'reservation_facts_changed'
  | 'arm_identity_mismatch'
  | 'emergency_stop_blocked';

export interface RealExecutionRiskRevalidationAssessment {
  readonly scope: 'real_execution_risk_revalidation';
  readonly status: 'risk_revalidation_ready' | 'blocked';
  readonly blockers: readonly RealExecutionRiskRevalidationBlocker[];
  readonly reservationCapacityStatus:
    'reservation_capacity_available' | 'blocked';
  readonly emergencyStopStatus: 'emergency_stop_clear_for_arm' | 'blocked';
  readonly plan: RealExecutionRiskApprovalPlan | null;
  readonly currentReservationExcludedBeforeRevalidation: boolean;
  readonly atomicEnforcement: false;
  readonly riskApproved: false;
  readonly confirmationRecorded: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function revalidateRealExecutionRisk(
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
  limits: RealExecutionLocalRiskLimits,
  budgetSnapshot: RealExecutionBudgetSnapshot,
  resourceSnapshot: RealExecutionResourceSnapshot,
  quotaSnapshot: RealExecutionProviderQuotaSnapshot,
  reservationSnapshot: RealExecutionReservationCapacitySnapshot,
  reservation: StoredRealExecutionReservation,
  arm: StoredRealExecutionArm,
  emergencyStopSnapshot: RealExecutionEmergencyStopSnapshot,
  policy: RealExecutionRiskRevalidationPolicy,
  evaluatedAt: Date,
): RealExecutionRiskRevalidationAssessment {
  const blockers: RealExecutionRiskRevalidationBlocker[] = [];
  const reservationValid = isValidStoredReservation(reservation);
  addIf(blockers, !reservationValid, 'invalid_stored_reservation');
  if (reservationValid && isValidDate(evaluatedAt)) {
    addIf(
      blockers,
      reservation.createdAt.getTime() > evaluatedAt.getTime(),
      'reservation_from_future',
    );
    addIf(
      blockers,
      reservation.expiresAt.getTime() <= evaluatedAt.getTime(),
      'reservation_expired',
    );
  }

  const records: readonly RealExecutionActiveReservation[] = Array.isArray(
    reservationSnapshot?.reservations,
  )
    ? reservationSnapshot.reservations
    : [];
  const storedRecord = reservationValid
    ? records.find((record) => record.id === reservation.id)
    : undefined;
  addIf(
    blockers,
    reservationValid && storedRecord === undefined,
    'reservation_missing_from_snapshot',
  );
  const storedRecordMatches =
    reservationValid &&
    storedRecord !== undefined &&
    activeRecordMatchesReservation(storedRecord, reservation);
  addIf(
    blockers,
    storedRecord !== undefined && !storedRecordMatches,
    'reservation_snapshot_record_mismatch',
  );

  const adjusted = adjustForCurrentReservation(
    budgetSnapshot,
    reservationSnapshot,
    reservation,
    storedRecordMatches,
  );
  addIf(
    blockers,
    storedRecordMatches && adjusted === null,
    'reserved_spend_below_reservation',
  );
  const adjustedBudget = adjusted?.budgetSnapshot ?? budgetSnapshot;
  const adjustedReservations =
    adjusted?.reservationSnapshot ?? reservationSnapshot;

  const capacity = assessRealExecutionReservationCapacity(
    intent,
    quote,
    limits,
    adjustedBudget,
    resourceSnapshot,
    quotaSnapshot,
    adjustedReservations,
    policy,
    evaluatedAt,
  );
  addIf(
    blockers,
    capacity.status !== 'reservation_capacity_available',
    'reservation_capacity_revalidation_blocked',
  );

  const rederived = planRealExecutionReservation(
    intent,
    quote,
    limits,
    adjustedBudget,
    resourceSnapshot,
    quotaSnapshot,
    policy,
    evaluatedAt,
  );
  const reservationFactsMatch =
    reservationValid &&
    rederived.plan !== null &&
    planMatchesReservation(rederived.plan, reservation);
  addIf(blockers, !reservationFactsMatch, 'reservation_facts_changed');

  const armMatches =
    reservationValid && armMatchesReservation(arm, reservation);
  addIf(blockers, !armMatches, 'arm_identity_mismatch');
  const emergencyStop = assessRealExecutionEmergencyStop(
    arm,
    emergencyStopSnapshot,
    { snapshotMaxAgeMs: policy.emergencyStopSnapshotMaxAgeMs },
    evaluatedAt,
  );
  addIf(
    blockers,
    emergencyStop.status !== 'emergency_stop_clear_for_arm',
    'emergency_stop_blocked',
  );

  const plan =
    blockers.length === 0 && emergencyStop.emergencyStopChangeId !== null
      ? {
          reservationId: reservation.id,
          armId: arm.id,
          providerId: reservation.providerId,
          chainId: reservation.chainId,
          intentId: reservation.intentId,
          quoteId: reservation.quoteId,
          emergencyStopChangeId: emergencyStop.emergencyStopChangeId,
          revalidatedAt: new Date(evaluatedAt),
          expiresAt: new Date(
            Math.min(reservation.expiresAt.getTime(), arm.expiresAt.getTime()),
          ),
        }
      : null;

  return {
    scope: 'real_execution_risk_revalidation',
    status: plan === null ? 'blocked' : 'risk_revalidation_ready',
    blockers,
    reservationCapacityStatus: capacity.status,
    emergencyStopStatus: emergencyStop.status,
    plan,
    currentReservationExcludedBeforeRevalidation: adjusted !== null,
    atomicEnforcement: false,
    riskApproved: false,
    confirmationRecorded: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function adjustForCurrentReservation(
  budgetSnapshot: RealExecutionBudgetSnapshot,
  reservationSnapshot: RealExecutionReservationCapacitySnapshot,
  reservation: StoredRealExecutionReservation,
  storedRecordMatches: boolean,
): {
  budgetSnapshot: RealExecutionBudgetSnapshot;
  reservationSnapshot: RealExecutionReservationCapacitySnapshot;
} | null {
  if (
    !storedRecordMatches ||
    !NON_NEGATIVE_DECIMAL_PATTERN.test(budgetSnapshot.reservedSpendUsdt) ||
    !POSITIVE_DECIMAL_PATTERN.test(reservation.budgetChargeUsdt)
  ) {
    return null;
  }
  const adjustedReservedSpend = new ExactDecimal(
    budgetSnapshot.reservedSpendUsdt,
  ).minus(reservation.budgetChargeUsdt);
  if (adjustedReservedSpend.isNegative()) return null;
  return {
    budgetSnapshot: {
      ...budgetSnapshot,
      reservedSpendUsdt: adjustedReservedSpend.toFixed(),
    },
    reservationSnapshot: {
      ...reservationSnapshot,
      reservations: reservationSnapshot.reservations.filter(
        (record) => record.id !== reservation.id,
      ),
    },
  };
}

function activeRecordMatchesReservation(
  record: RealExecutionActiveReservation,
  reservation: StoredRealExecutionReservation,
): boolean {
  return (
    typeof record === 'object' &&
    record !== null &&
    typeof record.sourceTokenAddress === 'string' &&
    record.id === reservation.id &&
    record.intentId === reservation.intentId &&
    record.quoteId === reservation.quoteId &&
    record.budgetChargeUsdt === reservation.budgetChargeUsdt &&
    record.sourceTokenAddress.toLowerCase() ===
      reservation.sourceTokenAddress &&
    record.sourceQuantity === reservation.sourceQuantity &&
    record.nativeGasQuantity === reservation.nativeGasQuantity &&
    record.providerQuotaUsd === reservation.providerQuotaUsd &&
    isValidDate(record.expiresAt) &&
    record.expiresAt.getTime() === reservation.expiresAt.getTime()
  );
}

function planMatchesReservation(
  plan: ReturnType<typeof planRealExecutionReservation>['plan'] & {},
  reservation: StoredRealExecutionReservation,
): boolean {
  return (
    plan.providerId === reservation.providerId &&
    plan.chainId === reservation.chainId &&
    plan.intentId === reservation.intentId &&
    plan.quoteId === reservation.quoteId &&
    plan.idempotencyKey === reservation.idempotencyKey &&
    plan.utcDay === reservation.utcDay &&
    plan.budgetChargeUsdt === reservation.budgetChargeUsdt &&
    plan.sourceTokenAddress === reservation.sourceTokenAddress &&
    plan.sourceSymbol === reservation.sourceSymbol &&
    plan.sourceQuantity === reservation.sourceQuantity &&
    plan.nativeGasSymbol === reservation.nativeGasSymbol &&
    plan.nativeGasQuantity === reservation.nativeGasQuantity &&
    plan.providerQuotaUsd === reservation.providerQuotaUsd &&
    plan.expiresAt.getTime() === reservation.expiresAt.getTime()
  );
}

function armMatchesReservation(
  arm: StoredRealExecutionArm,
  reservation: StoredRealExecutionReservation,
): boolean {
  return (
    typeof arm === 'object' &&
    arm !== null &&
    isValidDate(arm.createdAt) &&
    isValidDate(arm.expiresAt) &&
    arm.reservationId === reservation.id &&
    arm.providerId === reservation.providerId &&
    arm.chainId === reservation.chainId &&
    arm.intentId === reservation.intentId &&
    arm.quoteId === reservation.quoteId &&
    arm.createdAt.getTime() >= reservation.createdAt.getTime() &&
    arm.expiresAt.getTime() <= reservation.expiresAt.getTime()
  );
}

function isValidStoredReservation(
  reservation: StoredRealExecutionReservation,
): boolean {
  if (typeof reservation !== 'object' || reservation === null) return false;
  const sourceIdentityValid =
    (reservation.sourceTokenAddress === BSC_USDT_ADDRESS &&
      reservation.sourceSymbol === 'USDT') ||
    (reservation.sourceTokenAddress === BSC_BTCB_ADDRESS &&
      reservation.sourceSymbol === 'BTCB');
  return (
    UUID_PATTERN.test(reservation.id) &&
    reservation.providerId === AGENTIC_WALLET_PROVIDER_ID &&
    reservation.chainId === BSC_CHAIN_ID &&
    UUID_PATTERN.test(reservation.intentId) &&
    UUID_PATTERN.test(reservation.quoteId) &&
    IDEMPOTENCY_KEY_PATTERN.test(reservation.idempotencyKey) &&
    reservation.payloadCommitmentVersion === 'real_execution_intent_quote_v1' &&
    /^[a-f0-9]{64}$/.test(reservation.payloadCommitmentDigest) &&
    UTC_DAY_PATTERN.test(reservation.utcDay) &&
    sourceIdentityValid &&
    reservation.nativeGasSymbol === 'BNB' &&
    POSITIVE_DECIMAL_PATTERN.test(reservation.budgetChargeUsdt) &&
    POSITIVE_DECIMAL_PATTERN.test(reservation.sourceQuantity) &&
    POSITIVE_DECIMAL_PATTERN.test(reservation.nativeGasQuantity) &&
    POSITIVE_DECIMAL_PATTERN.test(reservation.providerQuotaUsd) &&
    isValidDate(reservation.createdAt) &&
    isValidDate(reservation.expiresAt) &&
    reservation.utcDay === reservation.createdAt.toISOString().slice(0, 10) &&
    reservation.createdAt.getTime() < reservation.expiresAt.getTime()
  );
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function addIf(
  blockers: RealExecutionRiskRevalidationBlocker[],
  condition: boolean,
  blocker: RealExecutionRiskRevalidationBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
