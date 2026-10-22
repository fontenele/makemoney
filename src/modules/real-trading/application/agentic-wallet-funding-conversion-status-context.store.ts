import type { FundingConversionStatusContext } from '../infrastructure/agentic-wallet-funding-conversion-status-response';

export interface FundingConversionStatusLookupContext {
  readonly attemptId: string;
  readonly attemptState:
    | 'submitted_pending_confirmation'
    | 'provider_finished_pending_financial_reconciliation'
    | 'provider_failed'
    | 'submission_outcome_unknown';
  readonly statusLookupRequired: boolean;
  readonly statusContext: FundingConversionStatusContext | null;
}

export abstract class AgenticWalletFundingConversionStatusContextStore {
  abstract getByAttemptId(
    attemptId: string,
  ): Promise<FundingConversionStatusLookupContext | null>;
}

export class FundingConversionStatusContextIdentityError extends Error {}
