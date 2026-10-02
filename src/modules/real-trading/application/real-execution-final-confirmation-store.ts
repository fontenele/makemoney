import {
  RealExecutionFinalConfirmationBlocker,
  RealExecutionFinalConfirmationPolicy,
  RealExecutionFinalConfirmationRequest,
} from './real-execution-final-confirmation-plan';

export interface RealExecutionFinalConfirmationCommand {
  readonly request: RealExecutionFinalConfirmationRequest;
  readonly policy: RealExecutionFinalConfirmationPolicy;
}

export interface StoredRealExecutionFinalConfirmation {
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
  readonly createdAt: Date;
  readonly riskApproved: true;
  readonly confirmationRecorded: true;
  readonly emergencyStopRecheckedForSubmission: false;
  readonly submissionAuthorized: false;
}

export interface RealExecutionFinalConfirmationStore {
  confirm(command: RealExecutionFinalConfirmationCommand): Promise<{
    confirmation: StoredRealExecutionFinalConfirmation;
    replayed: boolean;
  }>;
}

export class RealExecutionFinalConfirmationIdempotencyConflictError extends Error {
  constructor() {
    super('Real execution final confirmation id was reused differently');
    this.name = RealExecutionFinalConfirmationIdempotencyConflictError.name;
  }
}

export class RealExecutionFinalConfirmationApprovalNotFoundError extends Error {
  constructor() {
    super('Real execution risk approval was not found');
    this.name = RealExecutionFinalConfirmationApprovalNotFoundError.name;
  }
}

export class RealExecutionFinalConfirmationIdentityConflictError extends Error {
  constructor() {
    super(
      'Real execution approval, reservation, arm, intent, or quote is already confirmed',
    );
    this.name = RealExecutionFinalConfirmationIdentityConflictError.name;
  }
}

export class RealExecutionFinalConfirmationPlanError extends Error {
  constructor(
    readonly blockers: readonly RealExecutionFinalConfirmationBlocker[],
  ) {
    super('Real execution final confirmation plan is blocked');
    this.name = RealExecutionFinalConfirmationPlanError.name;
  }
}
