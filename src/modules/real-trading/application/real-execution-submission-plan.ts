import { StoredRealExecutionFinalConfirmation } from './real-execution-final-confirmation-store';
import { RealExecutionSubmissionEmergencyStopAssessment } from './real-execution-submission-emergency-stop';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PROVIDER_ID_PATTERN = /^[a-z][a-z0-9_-]{0,31}$/;
const CHAIN_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const CHANGE_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const AGENTIC_WALLET_PROVIDER_ID = 'agentic_wallet';
const BSC_CHAIN_ID = '56';
const ACKNOWLEDGMENT =
  'risk_approval_and_final_quote_reviewed_for_immediate_submission';
const MINIMUM_POLICY_MS = 1_000;
const MAXIMUM_POLICY_MS = 60_000;

export interface RealExecutionSubmissionPlanRequest {
  readonly id: string;
  readonly confirmationId: string;
  readonly approvalId: string;
  readonly reservationId: string;
  readonly armId: string;
  readonly providerId: string;
  readonly chainId: string;
  readonly intentId: string;
  readonly quoteId: string;
  readonly emergencyStopChangeId: string;
  readonly requestedAt: Date;
  readonly expiresAt: Date;
}

export interface RealExecutionSubmissionPlanPolicy {
  readonly requestMaxAgeMs: number;
  readonly stopAssessmentMaxAgeMs: number;
  readonly maximumPlanLifetimeMs: number;
}

export interface RealExecutionSubmissionPlan extends RealExecutionSubmissionPlanRequest {
  readonly initialSubmissionOnly: true;
  readonly automaticRetryAllowed: false;
}

export type RealExecutionSubmissionPlanBlocker =
  | 'invalid_final_confirmation'
  | 'invalid_emergency_stop_assessment'
  | 'invalid_submission_request'
  | 'invalid_evaluation_time'
  | 'submission_confirmation_mismatch'
  | 'submission_approval_mismatch'
  | 'submission_reservation_mismatch'
  | 'submission_arm_mismatch'
  | 'submission_provider_mismatch'
  | 'submission_chain_mismatch'
  | 'submission_intent_mismatch'
  | 'submission_quote_mismatch'
  | 'submission_emergency_stop_change_mismatch'
  | 'confirmation_from_future'
  | 'confirmation_expired'
  | 'emergency_stop_assessment_from_future'
  | 'emergency_stop_assessment_stale'
  | 'emergency_stop_assessment_predates_confirmation'
  | 'submission_request_from_future'
  | 'submission_request_stale'
  | 'submission_request_predates_stop_assessment'
  | 'submission_plan_expired'
  | 'submission_plan_outlives_confirmation'
  | 'submission_plan_lifetime_exceeded';

export interface RealExecutionSubmissionPlanAssessment {
  readonly scope: 'real_execution_submission_plan';
  readonly status: 'submission_plan_ready_for_atomic_gate' | 'blocked';
  readonly blockers: readonly RealExecutionSubmissionPlanBlocker[];
  readonly plan: RealExecutionSubmissionPlan | null;
  readonly riskApproved: boolean;
  readonly confirmationRecorded: boolean;
  readonly emergencyStopRecheckedForSubmission: boolean;
  readonly atomicStopEnforcementRequired: true;
  readonly confirmationConsumptionRequired: true;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function planRealExecutionSubmission(
  confirmation: StoredRealExecutionFinalConfirmation,
  stopAssessment: RealExecutionSubmissionEmergencyStopAssessment,
  request: RealExecutionSubmissionPlanRequest,
  policy: RealExecutionSubmissionPlanPolicy,
  evaluatedAt: Date,
): RealExecutionSubmissionPlanAssessment {
  validatePolicy(policy);
  const blockers: RealExecutionSubmissionPlanBlocker[] = [];
  const confirmationValid = isValidConfirmation(confirmation);
  const stopAssessmentValid = isValidStopAssessment(stopAssessment);
  const requestValid = isValidRequest(request);
  const evaluationTimeValid = isValidDate(evaluatedAt);
  addIf(blockers, !confirmationValid, 'invalid_final_confirmation');
  addIf(blockers, !stopAssessmentValid, 'invalid_emergency_stop_assessment');
  addIf(blockers, !requestValid, 'invalid_submission_request');
  addIf(blockers, !evaluationTimeValid, 'invalid_evaluation_time');

  if (confirmationValid && evaluationTimeValid) {
    addIf(
      blockers,
      confirmation.createdAt.getTime() > evaluatedAt.getTime(),
      'confirmation_from_future',
    );
    addIf(
      blockers,
      confirmation.expiresAt.getTime() <= evaluatedAt.getTime(),
      'confirmation_expired',
    );
  }

  if (stopAssessmentValid && evaluationTimeValid) {
    const stopAssessmentAgeMs =
      evaluatedAt.getTime() - stopAssessment.evaluatedAt.getTime();
    addIf(
      blockers,
      stopAssessmentAgeMs < 0,
      'emergency_stop_assessment_from_future',
    );
    addIf(
      blockers,
      stopAssessmentAgeMs > policy.stopAssessmentMaxAgeMs,
      'emergency_stop_assessment_stale',
    );
  }

  if (confirmationValid && stopAssessmentValid) {
    addIf(
      blockers,
      stopAssessment.confirmationId !== confirmation.id,
      'submission_confirmation_mismatch',
    );
    addIf(
      blockers,
      stopAssessment.emergencyStopChangeId !==
        confirmation.emergencyStopChangeId,
      'submission_emergency_stop_change_mismatch',
    );
    addIf(
      blockers,
      stopAssessment.evaluatedAt.getTime() < confirmation.createdAt.getTime(),
      'emergency_stop_assessment_predates_confirmation',
    );
  }

  if (confirmationValid && requestValid) {
    addIf(
      blockers,
      request.confirmationId !== confirmation.id,
      'submission_confirmation_mismatch',
    );
    addIf(
      blockers,
      request.approvalId !== confirmation.approvalId,
      'submission_approval_mismatch',
    );
    addIf(
      blockers,
      request.reservationId !== confirmation.reservationId,
      'submission_reservation_mismatch',
    );
    addIf(
      blockers,
      request.armId !== confirmation.armId,
      'submission_arm_mismatch',
    );
    addIf(
      blockers,
      request.providerId !== confirmation.providerId,
      'submission_provider_mismatch',
    );
    addIf(
      blockers,
      request.chainId !== confirmation.chainId,
      'submission_chain_mismatch',
    );
    addIf(
      blockers,
      request.intentId !== confirmation.intentId,
      'submission_intent_mismatch',
    );
    addIf(
      blockers,
      request.quoteId !== confirmation.quoteId,
      'submission_quote_mismatch',
    );
    addIf(
      blockers,
      request.emergencyStopChangeId !== confirmation.emergencyStopChangeId,
      'submission_emergency_stop_change_mismatch',
    );
    addIf(
      blockers,
      request.expiresAt.getTime() > confirmation.expiresAt.getTime(),
      'submission_plan_outlives_confirmation',
    );
  }

  if (stopAssessmentValid && requestValid) {
    addIf(
      blockers,
      request.requestedAt.getTime() < stopAssessment.evaluatedAt.getTime(),
      'submission_request_predates_stop_assessment',
    );
  }

  if (requestValid && evaluationTimeValid) {
    const requestAgeMs = evaluatedAt.getTime() - request.requestedAt.getTime();
    addIf(blockers, requestAgeMs < 0, 'submission_request_from_future');
    addIf(
      blockers,
      requestAgeMs > policy.requestMaxAgeMs,
      'submission_request_stale',
    );
    addIf(
      blockers,
      request.expiresAt.getTime() <= evaluatedAt.getTime(),
      'submission_plan_expired',
    );
    addIf(
      blockers,
      request.expiresAt.getTime() - request.requestedAt.getTime() >
        policy.maximumPlanLifetimeMs,
      'submission_plan_lifetime_exceeded',
    );
  }

  const plan =
    blockers.length === 0
      ? {
          ...request,
          requestedAt: new Date(request.requestedAt),
          expiresAt: new Date(request.expiresAt),
          initialSubmissionOnly: true as const,
          automaticRetryAllowed: false as const,
        }
      : null;
  return {
    scope: 'real_execution_submission_plan',
    status: plan === null ? 'blocked' : 'submission_plan_ready_for_atomic_gate',
    blockers,
    plan,
    riskApproved: plan !== null,
    confirmationRecorded: plan !== null,
    emergencyStopRecheckedForSubmission: plan !== null,
    atomicStopEnforcementRequired: true,
    confirmationConsumptionRequired: true,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function validatePolicy(policy: RealExecutionSubmissionPlanPolicy): void {
  if (typeof policy !== 'object' || policy === null) {
    throw new RangeError('Real execution submission policy is required');
  }
  for (const value of [
    policy.requestMaxAgeMs,
    policy.stopAssessmentMaxAgeMs,
    policy.maximumPlanLifetimeMs,
  ]) {
    if (
      !Number.isSafeInteger(value) ||
      value < MINIMUM_POLICY_MS ||
      value > MAXIMUM_POLICY_MS
    ) {
      throw new RangeError(
        'Real execution submission policy must be 1000-60000 ms',
      );
    }
  }
}

function isValidConfirmation(
  confirmation: StoredRealExecutionFinalConfirmation,
): boolean {
  return (
    typeof confirmation === 'object' &&
    confirmation !== null &&
    UUID_PATTERN.test(confirmation.id) &&
    UUID_PATTERN.test(confirmation.approvalId) &&
    UUID_PATTERN.test(confirmation.reservationId) &&
    UUID_PATTERN.test(confirmation.armId) &&
    confirmation.providerId === AGENTIC_WALLET_PROVIDER_ID &&
    confirmation.chainId === BSC_CHAIN_ID &&
    UUID_PATTERN.test(confirmation.intentId) &&
    UUID_PATTERN.test(confirmation.quoteId) &&
    CHANGE_ID_PATTERN.test(confirmation.emergencyStopChangeId) &&
    confirmation.acknowledgment === ACKNOWLEDGMENT &&
    isValidDate(confirmation.requestedAt) &&
    isValidDate(confirmation.createdAt) &&
    isValidDate(confirmation.expiresAt) &&
    confirmation.requestedAt.getTime() <= confirmation.createdAt.getTime() &&
    confirmation.createdAt.getTime() < confirmation.expiresAt.getTime() &&
    confirmation.riskApproved === true &&
    confirmation.confirmationRecorded === true &&
    confirmation.emergencyStopRecheckedForSubmission === false &&
    confirmation.submissionAuthorized === false
  );
}

function isValidStopAssessment(
  assessment: RealExecutionSubmissionEmergencyStopAssessment,
): boolean {
  return (
    typeof assessment === 'object' &&
    assessment !== null &&
    assessment.scope === 'real_execution_submission_emergency_stop' &&
    assessment.status === 'emergency_stop_clear_for_submission_review' &&
    Array.isArray(assessment.blockers) &&
    assessment.blockers.length === 0 &&
    typeof assessment.confirmationId === 'string' &&
    UUID_PATTERN.test(assessment.confirmationId) &&
    typeof assessment.emergencyStopChangeId === 'string' &&
    CHANGE_ID_PATTERN.test(assessment.emergencyStopChangeId) &&
    assessment.riskApproved === true &&
    assessment.confirmationRecorded === true &&
    assessment.emergencyStopRecheckedForSubmission === true &&
    assessment.atomicEnforcement === false &&
    assessment.submissionAuthorized === false &&
    isValidDate(assessment.evaluatedAt)
  );
}

function isValidRequest(request: RealExecutionSubmissionPlanRequest): boolean {
  return (
    typeof request === 'object' &&
    request !== null &&
    UUID_PATTERN.test(request.id) &&
    UUID_PATTERN.test(request.confirmationId) &&
    UUID_PATTERN.test(request.approvalId) &&
    UUID_PATTERN.test(request.reservationId) &&
    UUID_PATTERN.test(request.armId) &&
    PROVIDER_ID_PATTERN.test(request.providerId) &&
    CHAIN_ID_PATTERN.test(request.chainId) &&
    UUID_PATTERN.test(request.intentId) &&
    UUID_PATTERN.test(request.quoteId) &&
    CHANGE_ID_PATTERN.test(request.emergencyStopChangeId) &&
    isValidDate(request.requestedAt) &&
    isValidDate(request.expiresAt) &&
    request.expiresAt.getTime() > request.requestedAt.getTime()
  );
}

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function addIf(
  blockers: RealExecutionSubmissionPlanBlocker[],
  condition: boolean,
  blocker: RealExecutionSubmissionPlanBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
