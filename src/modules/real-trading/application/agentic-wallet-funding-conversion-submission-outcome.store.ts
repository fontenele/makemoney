import { AgenticWalletFundingConversionSubmissionOutcome } from '../infrastructure/agentic-wallet-funding-conversion-submission-response';

export interface FundingConversionSubmissionOutcomeRecord {
  readonly outcome: AgenticWalletFundingConversionSubmissionOutcome;
  readonly completedAt: Date;
}

export interface StoredFundingConversionSubmissionOutcome extends FundingConversionSubmissionOutcomeRecord {
  readonly stored: true;
}

export abstract class AgenticWalletFundingConversionSubmissionOutcomeStore {
  abstract record(value: FundingConversionSubmissionOutcomeRecord): Promise<{
    outcome: StoredFundingConversionSubmissionOutcome;
    replayed: boolean;
  }>;
}

export class FundingConversionSubmissionOutcomeBlockedError extends Error {}
export class FundingConversionSubmissionOutcomeConflictError extends Error {}
export class FundingConversionSubmissionAttemptNotFoundError extends Error {}
