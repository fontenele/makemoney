export interface RealExecutionSubmissionAttemptClaim {
  readonly id: string;
  readonly gateId: string;
}

export interface StoredRealExecutionSubmissionAttempt {
  readonly id: string;
  readonly gateId: string;
  readonly requestFingerprint: string;
  readonly providerId: 'agentic_wallet';
  readonly chainId: '56';
  readonly payloadCommitmentVersion: 'real_execution_intent_quote_v1';
  readonly payloadCommitmentDigest: string;
  readonly emergencyStopChangeId: string;
  readonly commandArgumentsFingerprint: string;
  readonly state: 'submission_claimed';
  readonly automaticRetryAllowed: false;
  readonly providerSubmissionStarted: false;
  readonly submissionAuthorized: false;
  readonly claimedAt: Date;
}

export interface ClaimedRealExecutionSubmissionCommand {
  readonly kind: 'agentic_wallet_claimed_market_swap';
  readonly attemptId: string;
  readonly gateId: string;
  readonly arguments: readonly string[];
  readonly commandArgumentsFingerprint: string;
  readonly automaticRetryAllowed: false;
}

export abstract class RealExecutionSubmissionAttemptStore {
  abstract claim(claim: RealExecutionSubmissionAttemptClaim): Promise<{
    attempt: StoredRealExecutionSubmissionAttempt;
    replayed: boolean;
    command: ClaimedRealExecutionSubmissionCommand | null;
  }>;
}

export type RealExecutionSubmissionAttemptBlocker =
  | 'invalid_attempt_id'
  | 'invalid_gate_id'
  | 'submission_gate_not_found'
  | 'submission_gate_invalid'
  | 'submission_gate_expired'
  | 'emergency_stop_not_persisted'
  | 'emergency_stop_active'
  | 'emergency_stop_change_mismatch'
  | 'submission_receipt_already_exists';

export class RealExecutionSubmissionAttemptBlockedError extends Error {
  constructor(
    readonly blockers: readonly RealExecutionSubmissionAttemptBlocker[],
  ) {
    super(`Real execution submission attempt blocked: ${blockers.join(', ')}`);
    this.name = RealExecutionSubmissionAttemptBlockedError.name;
  }
}

export class RealExecutionSubmissionAttemptConflictError extends Error {
  constructor() {
    super('Real execution submission gate was already claimed differently');
    this.name = RealExecutionSubmissionAttemptConflictError.name;
  }
}
