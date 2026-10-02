import {
  RealExecutionArmPlanBlocker,
  RealExecutionArmPolicy,
  RealExecutionArmRequest,
} from './real-execution-arm-plan';

export interface RealExecutionArmCommand {
  readonly request: RealExecutionArmRequest;
  readonly policy: RealExecutionArmPolicy;
}

export interface StoredRealExecutionArm {
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
  readonly createdAt: Date;
}

export interface RealExecutionArmStore {
  arm(command: RealExecutionArmCommand): Promise<{
    arm: StoredRealExecutionArm;
    replayed: boolean;
  }>;
}

export class RealExecutionArmIdempotencyConflictError extends Error {
  constructor() {
    super('Real execution arm id was reused differently');
    this.name = RealExecutionArmIdempotencyConflictError.name;
  }
}

export class RealExecutionArmReservationNotFoundError extends Error {
  constructor() {
    super('Real execution reservation was not found');
    this.name = RealExecutionArmReservationNotFoundError.name;
  }
}

export class RealExecutionArmIdentityConflictError extends Error {
  constructor() {
    super('Real execution reservation, intent, or quote is already armed');
    this.name = RealExecutionArmIdentityConflictError.name;
  }
}

export class RealExecutionArmPlanError extends Error {
  constructor(readonly blockers: readonly RealExecutionArmPlanBlocker[]) {
    super('Real execution arm plan is blocked');
    this.name = RealExecutionArmPlanError.name;
  }
}
