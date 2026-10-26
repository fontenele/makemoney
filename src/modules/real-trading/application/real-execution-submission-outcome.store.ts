import { AgenticWalletMarketSwapSubmissionResponseBlocker } from '../infrastructure/agentic-wallet-market-swap-submission-response';

export type RealExecutionSubmissionOutcomeStatus =
  'submitted_pending_confirmation' | 'submission_outcome_unknown';

export interface RealExecutionSubmissionOutcome {
  readonly attemptId: string;
  readonly gateId: string;
  readonly status: RealExecutionSubmissionOutcomeStatus;
  readonly providerOrderId: string | null;
  readonly responseFingerprint: string;
  readonly blockers: readonly AgenticWalletMarketSwapSubmissionResponseBlocker[];
  readonly executionSucceeded: false;
  readonly reconciliationRequired: true;
  readonly automaticRetryAllowed: false;
}

export interface StoredRealExecutionSubmissionOutcome extends RealExecutionSubmissionOutcome {
  readonly completedAt: Date;
}

export abstract class RealExecutionSubmissionOutcomeStore {
  abstract findByAttemptId(
    attemptId: string,
  ): Promise<StoredRealExecutionSubmissionOutcome | null>;
  abstract record(
    outcome: RealExecutionSubmissionOutcome,
    completedAt: Date,
  ): Promise<{
    outcome: StoredRealExecutionSubmissionOutcome;
    replayed: boolean;
  }>;
}

export class RealExecutionSubmissionOutcomeBlockedError extends Error {}
export class RealExecutionSubmissionOutcomeConflictError extends Error {}
export class RealExecutionSubmissionAttemptNotFoundError extends Error {}
