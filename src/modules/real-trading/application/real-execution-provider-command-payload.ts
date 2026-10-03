import Decimal from 'decimal.js';

import {
  RealExecutionIntent,
  RealExecutionQuote,
  validateRealExecutionIntent,
  validateRealExecutionQuote,
} from '../domain/real-execution';
import { StoredRealExecutionFinalConfirmation } from './real-execution-final-confirmation-store';
import { assessRealExecutionPayloadCommitment } from './real-execution-payload-commitment';
import { RealExecutionSubmissionPlan } from './real-execution-submission-plan';

const ExactDecimal = Decimal.clone({
  precision: 80,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -80,
  toExpPos: 80,
});
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CHANGE_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const PROVIDER_ID = 'agentic_wallet';
const CHAIN_ID = '56';
const COMMITMENT_VERSION = 'real_execution_intent_quote_v1';
const ACKNOWLEDGMENT =
  'risk_approval_and_final_quote_reviewed_for_immediate_submission';

export interface RealExecutionProviderCommandPayload {
  readonly kind: 'agentic_wallet_market_order_swap';
  readonly providerId: 'agentic_wallet';
  readonly chainId: '56';
  readonly sourceTokenAddress: string;
  readonly targetTokenAddress: string;
  readonly sourceQuantity: string;
  readonly maximumSlippagePercent: string;
  readonly mevProtection: true;
  readonly gasLevel: 'MEDIUM';
  readonly payloadCommitmentVersion: 'real_execution_intent_quote_v1';
  readonly payloadCommitmentDigest: string;
  readonly executable: false;
  readonly automaticRetryAllowed: false;
}

export type RealExecutionProviderCommandPayloadBlocker =
  | 'invalid_final_confirmation'
  | 'invalid_submission_plan'
  | 'invalid_intent'
  | 'invalid_quote'
  | 'invalid_evaluation_time'
  | 'submission_plan_identity_mismatch'
  | 'intent_identity_mismatch'
  | 'quote_identity_mismatch'
  | 'confirmation_from_future'
  | 'confirmation_expired'
  | 'submission_plan_from_future'
  | 'submission_plan_expired'
  | 'payload_commitment_blocked'
  | 'payload_commitment_mismatch';

export interface RealExecutionProviderCommandPayloadAssessment {
  readonly scope: 'real_execution_provider_command_payload';
  readonly status: 'provider_command_payload_verified' | 'blocked';
  readonly blockers: readonly RealExecutionProviderCommandPayloadBlocker[];
  readonly payload: RealExecutionProviderCommandPayload | null;
  readonly payloadCommitmentMatched: boolean;
  readonly atomicGateRequired: true;
  readonly confirmationConsumptionRequired: true;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function assessRealExecutionProviderCommandPayload(
  confirmation: StoredRealExecutionFinalConfirmation,
  submissionPlan: RealExecutionSubmissionPlan,
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
  evaluatedAt: Date,
): RealExecutionProviderCommandPayloadAssessment {
  const blockers: RealExecutionProviderCommandPayloadBlocker[] = [];
  const confirmationValid = isValidConfirmation(confirmation);
  const submissionPlanValid = isValidSubmissionPlan(submissionPlan);
  const intentValid = isValidIntent(intent);
  const quoteValid = isValidQuote(quote);
  const evaluationTimeValid = isValidDate(evaluatedAt);
  addIf(blockers, !confirmationValid, 'invalid_final_confirmation');
  addIf(blockers, !submissionPlanValid, 'invalid_submission_plan');
  addIf(blockers, !intentValid, 'invalid_intent');
  addIf(blockers, !quoteValid, 'invalid_quote');
  addIf(blockers, !evaluationTimeValid, 'invalid_evaluation_time');

  if (confirmationValid && submissionPlanValid) {
    addIf(
      blockers,
      !sameSubmissionIdentity(confirmation, submissionPlan),
      'submission_plan_identity_mismatch',
    );
  }
  if (confirmationValid && intentValid) {
    addIf(
      blockers,
      confirmation.intentId !== intent.id,
      'intent_identity_mismatch',
    );
  }
  if (confirmationValid && quoteValid) {
    addIf(
      blockers,
      confirmation.quoteId !== quote.id,
      'quote_identity_mismatch',
    );
  }
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
  if (submissionPlanValid && evaluationTimeValid) {
    addIf(
      blockers,
      submissionPlan.requestedAt.getTime() > evaluatedAt.getTime(),
      'submission_plan_from_future',
    );
    addIf(
      blockers,
      submissionPlan.expiresAt.getTime() <= evaluatedAt.getTime(),
      'submission_plan_expired',
    );
  }

  let payloadCommitmentMatched = false;
  if (confirmationValid && intentValid && quoteValid && evaluationTimeValid) {
    const commitmentAssessment = assessRealExecutionPayloadCommitment(
      intent,
      quote,
      evaluatedAt,
    );
    if (commitmentAssessment.commitment === null) {
      addIf(blockers, true, 'payload_commitment_blocked');
    } else {
      payloadCommitmentMatched =
        commitmentAssessment.commitment.version ===
          confirmation.payloadCommitmentVersion &&
        commitmentAssessment.commitment.digest ===
          confirmation.payloadCommitmentDigest;
      addIf(blockers, !payloadCommitmentMatched, 'payload_commitment_mismatch');
    }
  }

  const payload =
    blockers.length === 0
      ? {
          kind: 'agentic_wallet_market_order_swap' as const,
          providerId: PROVIDER_ID as 'agentic_wallet',
          chainId: CHAIN_ID as '56',
          sourceTokenAddress: intent.sourceAsset.tokenAddress.toLowerCase(),
          targetTokenAddress: intent.targetAsset.tokenAddress.toLowerCase(),
          sourceQuantity: canonicalDecimal(intent.sourceQuantity),
          maximumSlippagePercent: canonicalDecimal(
            new ExactDecimal(intent.maxSlippageRate).times(100).toFixed(),
          ),
          mevProtection: true as const,
          gasLevel: 'MEDIUM' as const,
          payloadCommitmentVersion:
            COMMITMENT_VERSION as 'real_execution_intent_quote_v1',
          payloadCommitmentDigest: confirmation.payloadCommitmentDigest,
          executable: false as const,
          automaticRetryAllowed: false as const,
        }
      : null;

  return {
    scope: 'real_execution_provider_command_payload',
    status: payload === null ? 'blocked' : 'provider_command_payload_verified',
    blockers,
    payload,
    payloadCommitmentMatched: payload !== null && payloadCommitmentMatched,
    atomicGateRequired: true,
    confirmationConsumptionRequired: true,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function sameSubmissionIdentity(
  confirmation: StoredRealExecutionFinalConfirmation,
  plan: RealExecutionSubmissionPlan,
): boolean {
  return (
    plan.confirmationId === confirmation.id &&
    plan.approvalId === confirmation.approvalId &&
    plan.reservationId === confirmation.reservationId &&
    plan.armId === confirmation.armId &&
    plan.providerId === confirmation.providerId &&
    plan.chainId === confirmation.chainId &&
    plan.intentId === confirmation.intentId &&
    plan.quoteId === confirmation.quoteId &&
    plan.emergencyStopChangeId === confirmation.emergencyStopChangeId &&
    plan.requestedAt.getTime() >= confirmation.createdAt.getTime() &&
    plan.expiresAt.getTime() <= confirmation.expiresAt.getTime()
  );
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
    confirmation.providerId === PROVIDER_ID &&
    confirmation.chainId === CHAIN_ID &&
    UUID_PATTERN.test(confirmation.intentId) &&
    UUID_PATTERN.test(confirmation.quoteId) &&
    confirmation.payloadCommitmentVersion === COMMITMENT_VERSION &&
    DIGEST_PATTERN.test(confirmation.payloadCommitmentDigest) &&
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

function isValidSubmissionPlan(plan: RealExecutionSubmissionPlan): boolean {
  return (
    typeof plan === 'object' &&
    plan !== null &&
    UUID_PATTERN.test(plan.id) &&
    UUID_PATTERN.test(plan.confirmationId) &&
    UUID_PATTERN.test(plan.approvalId) &&
    UUID_PATTERN.test(plan.reservationId) &&
    UUID_PATTERN.test(plan.armId) &&
    plan.providerId === PROVIDER_ID &&
    plan.chainId === CHAIN_ID &&
    UUID_PATTERN.test(plan.intentId) &&
    UUID_PATTERN.test(plan.quoteId) &&
    CHANGE_ID_PATTERN.test(plan.emergencyStopChangeId) &&
    isValidDate(plan.requestedAt) &&
    isValidDate(plan.expiresAt) &&
    plan.requestedAt.getTime() < plan.expiresAt.getTime() &&
    plan.initialSubmissionOnly === true &&
    plan.automaticRetryAllowed === false
  );
}

function isValidIntent(intent: RealExecutionIntent): boolean {
  try {
    validateRealExecutionIntent(intent);
    return true;
  } catch {
    return false;
  }
}

function isValidQuote(quote: RealExecutionQuote): boolean {
  try {
    validateRealExecutionQuote(quote);
    return true;
  } catch {
    return false;
  }
}

function canonicalDecimal(value: string): string {
  return new ExactDecimal(value).toFixed();
}

function isValidDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function addIf(
  blockers: RealExecutionProviderCommandPayloadBlocker[],
  condition: boolean,
  blocker: RealExecutionProviderCommandPayloadBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
