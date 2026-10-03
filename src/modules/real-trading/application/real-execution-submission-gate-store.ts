import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { RealExecutionProviderCommandPayloadBlocker } from './real-execution-provider-command-payload';
import {
  RealExecutionSubmissionEmergencyStopBlocker,
  RealExecutionSubmissionEmergencyStopPolicy,
} from './real-execution-submission-emergency-stop';
import { RealExecutionSubmissionPlan } from './real-execution-submission-plan';

export interface RealExecutionSubmissionGateCommand {
  readonly id: string;
  readonly submissionPlan: RealExecutionSubmissionPlan;
  readonly intent: RealExecutionIntent;
  readonly quote: RealExecutionQuote;
  readonly emergencyStopPolicy: RealExecutionSubmissionEmergencyStopPolicy;
}

export interface StoredRealExecutionSubmissionGate {
  readonly id: string;
  readonly confirmationId: string;
  readonly approvalId: string;
  readonly reservationId: string;
  readonly armId: string;
  readonly submissionPlanId: string;
  readonly providerId: 'agentic_wallet';
  readonly chainId: '56';
  readonly intentId: string;
  readonly quoteId: string;
  readonly payloadCommitmentVersion: 'real_execution_intent_quote_v1';
  readonly payloadCommitmentDigest: string;
  readonly emergencyStopChangeId: string;
  readonly sourceTokenAddress: string;
  readonly targetTokenAddress: string;
  readonly sourceQuantity: string;
  readonly maximumSlippagePercent: string;
  readonly mevProtection: true;
  readonly gasLevel: 'MEDIUM';
  readonly status: 'prepared_not_submitted';
  readonly emergencyStopRecheckedAt: Date;
  readonly confirmationConsumedAt: Date;
  readonly createdAt: Date;
  readonly atomicGateSatisfied: true;
  readonly confirmationConsumed: true;
  readonly providerSubmissionStarted: false;
  readonly submissionAuthorized: false;
}

export interface RealExecutionSubmissionGateStore {
  create(command: RealExecutionSubmissionGateCommand): Promise<{
    gate: StoredRealExecutionSubmissionGate;
    replayed: boolean;
  }>;
}

export type RealExecutionSubmissionGateBlocker =
  | 'invalid_gate_id'
  | RealExecutionSubmissionEmergencyStopBlocker
  | RealExecutionProviderCommandPayloadBlocker;

export class RealExecutionSubmissionGateIdempotencyConflictError extends Error {
  constructor() {
    super('Real execution submission gate id was reused differently');
    this.name = RealExecutionSubmissionGateIdempotencyConflictError.name;
  }
}

export class RealExecutionSubmissionGateConfirmationNotFoundError extends Error {
  constructor() {
    super('Real execution final confirmation was not found');
    this.name = RealExecutionSubmissionGateConfirmationNotFoundError.name;
  }
}

export class RealExecutionSubmissionGateIdentityConflictError extends Error {
  constructor() {
    super(
      'Real execution confirmation or protected identity is already consumed',
    );
    this.name = RealExecutionSubmissionGateIdentityConflictError.name;
  }
}

export class RealExecutionSubmissionGateBlockedError extends Error {
  constructor(
    readonly blockers: readonly RealExecutionSubmissionGateBlocker[],
  ) {
    super('Real execution submission gate is blocked');
    this.name = RealExecutionSubmissionGateBlockedError.name;
  }
}
