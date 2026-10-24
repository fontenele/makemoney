export interface AgenticWalletFundingConversionSubmissionClaim {
  readonly id: string;
  readonly planId: string;
  readonly planFingerprint: string;
  readonly confirmationPhrase: string;
  readonly freshSourceQuantityBnb: string;
  readonly freshExpectedUsdt: string;
  readonly freshMinimumUsdt: string;
  readonly freshMaximumSlippagePercent: string;
  readonly freshRemainingQuantityBnb: string;
  readonly preConversionWalletAddress: string;
  readonly preConversionBalanceBlockNumber: string;
  readonly preConversionBnbBalance: string;
  readonly preConversionUsdtBalance: string;
  readonly preConversionBalanceObservedAt: Date;
  readonly providerFeeRate: string;
  readonly providerFeeUsd: string;
  readonly estimatedNetworkFeeUsd: string;
  readonly feeEvidenceGasMode: string;
  readonly feeEvidenceObservedAt: Date;
  readonly startedAt: Date;
}

export interface StoredAgenticWalletFundingConversionSubmissionAttempt {
  readonly id: string;
  readonly planId: string;
  readonly requestFingerprint: string;
  readonly freshSourceQuantityBnb: string;
  readonly freshExpectedUsdt: string;
  readonly freshMinimumUsdt: string;
  readonly freshMaximumSlippagePercent: string;
  readonly freshRemainingQuantityBnb: string;
  readonly preConversionWalletAddress: string;
  readonly preConversionBalanceBlockNumber: string;
  readonly preConversionBnbBalance: string;
  readonly preConversionUsdtBalance: string;
  readonly preConversionBalanceObservedAt: Date;
  readonly providerFeeRate: string;
  readonly providerFeeUsd: string;
  readonly estimatedNetworkFeeUsd: string;
  readonly feeEvidenceGasMode: string;
  readonly feeEvidenceObservedAt: Date;
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
