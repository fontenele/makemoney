import { StoredRealExecutionReservation } from './real-execution-reservation-store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const UTC_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const PROVIDER_ID_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;
const CHAIN_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;
const IDEMPOTENCY_KEY_PATTERN = /^[\x21-\x7e]{1,128}$/;
const AGENTIC_WALLET_PROVIDER_ID = 'agentic_wallet';
const BSC_CHAIN_ID = '56';
const BSC_USDT_ADDRESS = '0x55d398326f99059ff775485246999027b3197955';
const BSC_BTCB_ADDRESS = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const MINIMUM_POLICY_MS = 1_000;
const MAXIMUM_POLICY_MS = 60_000;

export interface RealExecutionArmRequest {
  readonly id: string;
  readonly reservationId: string;
  readonly providerId: string;
  readonly chainId: string;
  readonly intentId: string;
  readonly quoteId: string;
  readonly acknowledgment: 'reservation_and_quote_reviewed';
  readonly requestedAt: Date;
  readonly expiresAt: Date;
}

export interface RealExecutionArmPolicy {
  readonly requestMaxAgeMs: number;
  readonly maximumArmLifetimeMs: number;
}

export interface RealExecutionArmPlan {
  readonly id: string;
  readonly reservationId: string;
  readonly providerId: string;
  readonly chainId: string;
  readonly intentId: string;
  readonly quoteId: string;
  readonly payloadCommitmentVersion: 'real_execution_intent_quote_v1';
  readonly payloadCommitmentDigest: string;
  readonly acknowledgment: 'reservation_and_quote_reviewed';
  readonly requestedAt: Date;
  readonly expiresAt: Date;
}

export type RealExecutionArmPlanBlocker =
  | 'invalid_reservation'
  | 'invalid_arm_request'
  | 'invalid_evaluation_time'
  | 'operator_acknowledgment_missing'
  | 'arm_reservation_mismatch'
  | 'arm_provider_mismatch'
  | 'arm_chain_mismatch'
  | 'arm_intent_mismatch'
  | 'arm_quote_mismatch'
  | 'arm_request_from_future'
  | 'arm_request_stale'
  | 'arm_predates_reservation'
  | 'reservation_expired'
  | 'arm_expired'
  | 'arm_outlives_reservation'
  | 'arm_lifetime_exceeded';

export interface RealExecutionArmPlanAssessment {
  readonly scope: 'real_execution_arm_plan';
  readonly status: 'arm_plan_ready' | 'blocked';
  readonly blockers: readonly RealExecutionArmPlanBlocker[];
  readonly plan: RealExecutionArmPlan | null;
  readonly durableArmCreated: false;
  readonly emergencyStopChecked: false;
  readonly riskApproved: false;
  readonly confirmationRecorded: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function planRealExecutionArm(
  reservation: StoredRealExecutionReservation,
  request: RealExecutionArmRequest,
  policy: RealExecutionArmPolicy,
  evaluatedAt: Date,
): RealExecutionArmPlanAssessment {
  validatePolicy(policy);
  const blockers: RealExecutionArmPlanBlocker[] = [];
  const reservationValid = isValidReservation(reservation);
  const requestValid = isValidRequest(request);
  const evaluationTimeValid = isValidDate(evaluatedAt);
  addIf(blockers, !reservationValid, 'invalid_reservation');
  addIf(blockers, !requestValid, 'invalid_arm_request');
  addIf(blockers, !evaluationTimeValid, 'invalid_evaluation_time');
  addIf(
    blockers,
    request.acknowledgment !== 'reservation_and_quote_reviewed',
    'operator_acknowledgment_missing',
  );

  if (reservationValid && requestValid && evaluationTimeValid) {
    addIf(
      blockers,
      request.reservationId !== reservation.id,
      'arm_reservation_mismatch',
    );
    addIf(
      blockers,
      request.providerId !== reservation.providerId,
      'arm_provider_mismatch',
    );
    addIf(
      blockers,
      request.chainId !== reservation.chainId,
      'arm_chain_mismatch',
    );
    addIf(
      blockers,
      request.intentId !== reservation.intentId,
      'arm_intent_mismatch',
    );
    addIf(
      blockers,
      request.quoteId !== reservation.quoteId,
      'arm_quote_mismatch',
    );
    const requestAgeMs = evaluatedAt.getTime() - request.requestedAt.getTime();
    addIf(blockers, requestAgeMs < 0, 'arm_request_from_future');
    addIf(blockers, requestAgeMs > policy.requestMaxAgeMs, 'arm_request_stale');
    addIf(
      blockers,
      request.requestedAt.getTime() < reservation.createdAt.getTime(),
      'arm_predates_reservation',
    );
    addIf(
      blockers,
      reservation.expiresAt.getTime() <= evaluatedAt.getTime(),
      'reservation_expired',
    );
    addIf(
      blockers,
      request.expiresAt.getTime() <= evaluatedAt.getTime(),
      'arm_expired',
    );
    addIf(
      blockers,
      request.expiresAt.getTime() > reservation.expiresAt.getTime(),
      'arm_outlives_reservation',
    );
    addIf(
      blockers,
      request.expiresAt.getTime() - request.requestedAt.getTime() >
        policy.maximumArmLifetimeMs,
      'arm_lifetime_exceeded',
    );
  }

  const plan =
    blockers.length === 0
      ? {
          id: request.id,
          reservationId: request.reservationId,
          providerId: request.providerId,
          chainId: request.chainId,
          intentId: request.intentId,
          quoteId: request.quoteId,
          payloadCommitmentVersion: reservation.payloadCommitmentVersion,
          payloadCommitmentDigest: reservation.payloadCommitmentDigest,
          acknowledgment: request.acknowledgment,
          requestedAt: new Date(request.requestedAt),
          expiresAt: new Date(request.expiresAt),
        }
      : null;
  return {
    scope: 'real_execution_arm_plan',
    status: plan ? 'arm_plan_ready' : 'blocked',
    blockers,
    plan,
    durableArmCreated: false,
    emergencyStopChecked: false,
    riskApproved: false,
    confirmationRecorded: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function validatePolicy(policy: RealExecutionArmPolicy): void {
  for (const value of [policy.requestMaxAgeMs, policy.maximumArmLifetimeMs]) {
    if (
      !Number.isSafeInteger(value) ||
      value < MINIMUM_POLICY_MS ||
      value > MAXIMUM_POLICY_MS
    ) {
      throw new RangeError('Real execution arm policy must be 1000-60000 ms');
    }
  }
}

function isValidReservation(
  reservation: StoredRealExecutionReservation,
): boolean {
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
    reservation.utcDay === utcDay(reservation.createdAt) &&
    reservation.expiresAt.getTime() > reservation.createdAt.getTime()
  );
}

function isValidRequest(request: RealExecutionArmRequest): boolean {
  return (
    UUID_PATTERN.test(request.id) &&
    UUID_PATTERN.test(request.reservationId) &&
    PROVIDER_ID_PATTERN.test(request.providerId) &&
    CHAIN_ID_PATTERN.test(request.chainId) &&
    UUID_PATTERN.test(request.intentId) &&
    UUID_PATTERN.test(request.quoteId) &&
    isValidDate(request.requestedAt) &&
    isValidDate(request.expiresAt) &&
    request.expiresAt.getTime() > request.requestedAt.getTime()
  );
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function utcDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function addIf(
  blockers: RealExecutionArmPlanBlocker[],
  condition: boolean,
  blocker: RealExecutionArmPlanBlocker,
): void {
  if (condition) blockers.push(blocker);
}
