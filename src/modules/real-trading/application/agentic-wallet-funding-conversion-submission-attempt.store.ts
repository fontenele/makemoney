export interface AgenticWalletFundingConversionSubmissionClaim {
  readonly id: string;
  readonly planId: string;
  readonly planFingerprint: string;
  readonly confirmationPhrase: string;
  readonly freshExpectedUsdt: string;
  readonly freshMinimumUsdt: string;
  readonly freshRemainingQuantityBnb: string;
  readonly startedAt: Date;
}

export interface StoredAgenticWalletFundingConversionSubmissionAttempt {
  readonly id: string;
  readonly planId: string;
  readonly requestFingerprint: string;
  readonly freshExpectedUsdt: string;
  readonly freshMinimumUsdt: string;
  readonly freshRemainingQuantityBnb: string;
  readonly state: 'submission_claimed';
  readonly automaticRetryAllowed: false;
  readonly startedAt: Date;
}

export abstract class AgenticWalletFundingConversionSubmissionAttemptStore {
  abstract claim(
    claim: AgenticWalletFundingConversionSubmissionClaim,
  ): Promise<{
    attempt: StoredAgenticWalletFundingConversionSubmissionAttempt;
    replayed: boolean;
  }>;
}

export class FundingConversionSubmissionClaimBlockedError extends Error {
  constructor(readonly blockers: readonly string[]) {
    super(
      `Funding conversion submission claim blocked: ${blockers.join(', ')}`,
    );
  }
}

export class FundingConversionSubmissionClaimConflictError extends Error {
  constructor() {
    super('Funding conversion plan was already consumed by another request');
  }
}
