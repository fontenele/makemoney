import { FundingConversionStatusObservation } from '../infrastructure/agentic-wallet-funding-conversion-status-response';

export interface StoredFundingConversionStatusObservation {
  readonly id: string;
  readonly observation: FundingConversionStatusObservation;
  readonly recordedAt: Date;
}

export abstract class AgenticWalletFundingConversionStatusObservationStore {
  abstract record(
    id: string,
    observation: FundingConversionStatusObservation,
    recordedAt: Date,
  ): Promise<{
    stored: StoredFundingConversionStatusObservation;
    replayed: boolean;
  }>;
}

export class FundingConversionStatusObservationBlockedError extends Error {}
export class FundingConversionStatusObservationConflictError extends Error {}
export class FundingConversionStatusAttemptNotFoundError extends Error {}
