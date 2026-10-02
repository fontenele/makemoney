import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { RealExecutionBudgetSnapshot } from './real-execution-budget-risk';
import { RealExecutionLocalRiskLimits } from './real-execution-local-risk-limits';
import { RealExecutionProviderQuotaSnapshot } from './real-execution-provider-quota-risk';
import { RealExecutionResourceSnapshot } from './real-execution-resource-risk';
import {
  RealExecutionRiskRevalidationBlocker,
  RealExecutionRiskRevalidationPolicy,
} from './real-execution-risk-revalidation';

export interface RealExecutionRiskApprovalRequest {
  readonly id: string;
  readonly reservationId: string;
  readonly armId: string;
}

export interface RealExecutionRiskApprovalCommand {
  readonly request: RealExecutionRiskApprovalRequest;
  readonly intent: RealExecutionIntent;
  readonly quote: RealExecutionQuote;
  readonly limits: RealExecutionLocalRiskLimits;
  readonly budgetSnapshot: RealExecutionBudgetSnapshot;
  readonly resourceSnapshot: RealExecutionResourceSnapshot;
  readonly quotaSnapshot: RealExecutionProviderQuotaSnapshot;
  readonly policy: RealExecutionRiskRevalidationPolicy;
}

export interface StoredRealExecutionRiskApproval {
  readonly id: string;
  readonly reservationId: string;
  readonly armId: string;
  readonly providerId: string;
  readonly chainId: string;
  readonly intentId: string;
  readonly quoteId: string;
  readonly payloadCommitmentVersion: 'real_execution_intent_quote_v1';
  readonly payloadCommitmentDigest: string;
  readonly emergencyStopChangeId: string;
  readonly revalidatedAt: Date;
  readonly expiresAt: Date;
  readonly createdAt: Date;
  readonly riskApproved: true;
  readonly confirmationRecorded: false;
  readonly submissionAuthorized: false;
}

export interface RealExecutionRiskApprovalStore {
  approve(command: RealExecutionRiskApprovalCommand): Promise<{
    approval: StoredRealExecutionRiskApproval;
    replayed: boolean;
  }>;
}

export class RealExecutionRiskApprovalIdempotencyConflictError extends Error {
  constructor() {
    super('Real execution risk approval id was reused differently');
    this.name = RealExecutionRiskApprovalIdempotencyConflictError.name;
  }
}

export class RealExecutionRiskApprovalArtifactNotFoundError extends Error {
  constructor() {
    super('Real execution reservation or arm was not found');
    this.name = RealExecutionRiskApprovalArtifactNotFoundError.name;
  }
}

export class RealExecutionRiskApprovalIdentityConflictError extends Error {
  constructor() {
    super(
      'Real execution reservation, arm, intent, or quote is already approved',
    );
    this.name = RealExecutionRiskApprovalIdentityConflictError.name;
  }
}

export class RealExecutionRiskApprovalBlockedError extends Error {
  constructor(
    readonly blockers: readonly RealExecutionRiskRevalidationBlocker[],
  ) {
    super('Real execution risk approval is blocked');
    this.name = RealExecutionRiskApprovalBlockedError.name;
  }
}
