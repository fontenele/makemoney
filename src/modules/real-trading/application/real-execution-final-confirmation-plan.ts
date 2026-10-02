import { StoredRealExecutionRiskApproval } from './real-execution-risk-approval-store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PROVIDER_ID_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;
const CHAIN_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const AGENTIC_WALLET_PROVIDER_ID = 'agentic_wallet';
const BSC_CHAIN_ID = '56';
const MINIMUM_POLICY_MS = 1_000;
const MAXIMUM_POLICY_MS = 60_000;

export interface RealExecutionFinalConfirmationRequest {
  readonly id: string;
  readonly approvalId: string;
  readonly reservationId: string;
  readonly armId: string;
  readonly providerId: string;
  readonly chainId: string;
  readonly intentId: string;
  readonly quoteId: string;
  readonly emergencyStopChangeId: string;
  readonly acknowledgment: 'risk_approval_and_final_quote_reviewed_for_immediate_submission';
  readonly requestedAt: Date;
  readonly expiresAt: Date;
}

export interface RealExecutionFinalConfirmationPolicy {
  readonly requestMaxAgeMs: number;
  readonly maximumConfirmationLifetimeMs: number;
}

export type RealExecutionFinalConfirmationPlan =
  RealExecutionFinalConfirmationRequest;

export type RealExecutionFinalConfirmationBlocker =
  | 'invalid_risk_approval'
  | 'invalid_confirmation_request'
  | 'invalid_evaluation_time'
  | 'final_confirmation_acknowledgment_missing'
  | 'confirmation_approval_mismatch'
  | 'confirmation_reservation_mismatch'
  | 'confirmation_arm_mismatch'
  | 'confirmation_provider_mismatch'
  | 'confirmation_chain_mismatch'
  | 'confirmation_intent_mismatch'
  | 'confirmation_quote_mismatch'
  | 'confirmation_emergency_stop_change_mismatch'
  | 'approval_from_future'
  | 'approval_expired'
  | 'confirmation_request_from_future'
  | 'confirmation_request_stale'
  | 'confirmation_predates_approval'
  | 'confirmation_expired'
  | 'confirmation_outlives_approval'
  | 'confirmation_lifetime_exceeded';

export interface RealExecutionFinalConfirmationAssessment {
  readonly scope: 'real_execution_final_confirmation_plan';
  readonly status: 'final_confirmation_plan_ready' | 'blocked';
  readonly blockers: readonly RealExecutionFinalConfirmationBlocker[];
  readonly plan: RealExecutionFinalConfirmationPlan | null;
  readonly riskApproved: boolean;
  readonly durableConfirmationRecorded: false;
  readonly emergencyStopRecheckedForSubmission: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function planRealExecutionFinalConfirmation(
  approval: StoredRealExecutionRiskApproval,
  request: RealExecutionFinalConfirmationRequest,
  policy: RealExecutionFinalConfirmationPolicy,
  evaluatedAt: Date,
): RealExecutionFinalConfirmationAssessment {
  validatePolicy(policy);
  const blockers: RealExecutionFinalConfirmationBlocker[] = [];
  const approvalValid = isValidApproval(approval);
  const requestValid = isValidRequest(request);
  const evaluationTimeValid = isValidDate(evaluatedAt);
  addIf(blockers, !approvalValid, 'invalid_risk_approval');
  addIf(blockers, !requestValid, 'invalid_confirmation_request');
  addIf(blockers, !evaluationTimeValid, 'invalid_evaluation_time');
  addIf(
    blockers,
    request.acknowledgment !==
      'risk_approval_and_final_quote_reviewed_for_immediate_submission',
    'final_confirmation_acknowledgment_missing',
  );

  if (approvalValid && requestValid && evaluationTimeValid) {
    addIf(
      blockers,
      request.approvalId !== approval.id,
      'confirmation_approval_mismatch',
    );
    addIf(
      blockers,
      request.reservationId !== approval.reservationId,
      'confirmation_reservation_mismatch',
    );
    addIf(
      blockers,
      request.armId !== approval.armId,
      'confirmation_arm_mismatch',
    );
    addIf(
      blockers,
      request.providerId !== approval.providerId,
      'confirmation_provider_mismatch',
    );
    addIf(
      blockers,
      request.chainId !== approval.chainId,
      'confirmation_chain_mismatch',
    );
    addIf(
      blockers,
      request.intentId !== approval.intentId,
      'confirmation_intent_mismatch',
    );
    addIf(
      blockers,
      request.quoteId !== approval.quoteId,
      'confirmation_quote_mismatch',
    );
    addIf(
      blockers,
      request.emergencyStopChangeId !== approval.emergencyStopChangeId,
      'confirmation_emergency_stop_change_mismatch',
    );
    addIf(
      blockers,
      approval.createdAt.getTime() > evaluatedAt.getTime(),
      'approval_from_future',
    );
    addIf(
      blockers,
      approval.expiresAt.getTime() <= evaluatedAt.getTime(),
      'approval_expired',
    );
    const requestAgeMs = evaluatedAt.getTime() - request.requestedAt.getTime();
    addIf(blockers, requestAgeMs < 0, 'confirmation_request_from_future');
    addIf(
      blockers,
      requestAgeMs > policy.requestMaxAgeMs,
      'confirmation_request_stale',
    );
    addIf(
      blockers,
      request.requestedAt.getTime() < approval.createdAt.getTime(),
      'confirmation_predates_approval',
    );
    addIf(
      blockers,
      request.expiresAt.getTime() <= evaluatedAt.getTime(),
      'confirmation_expired',
    );
    addIf(
      blockers,
      request.expiresAt.getTime() > approval.expiresAt.getTime(),
      'confirmation_outlives_approval',
    );
    addIf(
      blockers,
      request.expiresAt.getTime() - request.requestedAt.getTime() >
        policy.maximumConfirmationLifetimeMs,
      'confirmation_lifetime_exceeded',
    );
  }

  const plan =
    blockers.length === 0
      ? {
          ...request,
          requestedAt: new Date(request.requestedAt),
          expiresAt: new Date(request.expiresAt),
        }
      : null;
  return {
    scope: 'real_execution_final_confirmation_plan',
    status: plan === null ? 'blocked' : 'final_confirmation_plan_ready',
    blockers,
    plan,
    riskApproved: plan !== null,
    durableConfirmationRecorded: false,
    emergencyStopRecheckedForSubmission: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function validatePolicy(policy: RealExecutionFinalConfirmationPolicy): void {
  for (const value of [
    policy.requestMaxAgeMs,
    policy.maximumConfirmationLifetimeMs,
  ]) {
    if (
      !Number.isSafeInteger(value) ||
      value < MINIMUM_POLICY_MS ||
      value > MAXIMUM_POLICY_MS
    ) {
      throw new RangeError(
        'Real execution final confirmation policy must be 1000-60000 ms',
      );
    }
  }
}

function isValidApproval(approval: StoredRealExecutionRiskApproval): boolean {
  return (
    typeof approval === 'object' &&
    approval !== null &&
    UUID_PATTERN.test(approval.id) &&
    UUID_PATTERN.test(approval.reservationId) &&
    UUID_PATTERN.test(approval.armId) &&
    approval.providerId === AGENTIC_WALLET_PROVIDER_ID &&
    approval.chainId === BSC_CHAIN_ID &&
    UUID_PATTERN.test(approval.intentId) &&
    UUID_PATTERN.test(approval.quoteId) &&
    UUID_PATTERN.test(approval.emergencyStopChangeId) &&
    isValidDate(approval.revalidatedAt) &&
    isValidDate(approval.createdAt) &&
    isValidDate(approval.expiresAt) &&
    approval.revalidatedAt.getTime() <= approval.createdAt.getTime() &&
    approval.createdAt.getTime() < approval.expiresAt.getTime() &&
    approval.riskApproved === true &&
    approval.confirmationRecorded === false &&
    approval.submissionAuthorized === false
  );
}

function isValidRequest(
  request: RealExecutionFinalConfirmationRequest,
): boolean {
  return (
    typeof request === 'object' &&
    request !== null &&
    UUID_PATTERN.test(request.id) &&
    UUID_PATTERN.test(request.approvalId) &&
    UUID_PATTERN.test(request.reservationId) &&
    UUID_PATTERN.test(request.armId) &&
    PROVIDER_ID_PATTERN.test(request.providerId) &&
    CHAIN_ID_PATTERN.test(request.chainId) &&
    UUID_PATTERN.test(request.intentId) &&
    UUID_PATTERN.test(request.quoteId) &&
    UUID_PATTERN.test(request.emergencyStopChangeId) &&
    isValidDate(request.requestedAt) &&
    isValidDate(request.expiresAt) &&
    request.expiresAt.getTime() > request.requestedAt.getTime()
  );
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function addIf(
  blockers: RealExecutionFinalConfirmationBlocker[],
  condition: boolean,
  blocker: RealExecutionFinalConfirmationBlocker,
): void {
  if (condition) blockers.push(blocker);
}
