import type {
  FundingConversionFinancialReconciliationEvidence,
  FundingConversionFinancialReconciliationEvidenceBlocker,
  FundingConversionOutputAssessment,
} from '../infrastructure/agentic-wallet-funding-conversion-financial-reconciliation-evidence';

export interface StoredFundingConversionFinancialReconciliation {
  readonly id: string;
  readonly attemptId: string;
  readonly planId: string;
  readonly expectedUsdt: string;
  readonly minimumUsdt: string;
  readonly outputAssessment: FundingConversionOutputAssessment;
  readonly evidence: FundingConversionFinancialReconciliationEvidence;
  readonly recordedAt: Date;
  readonly financialReconciliationComplete: true;
  readonly automaticRetryAllowed: false;
}

export abstract class AgenticWalletFundingConversionFinancialReconciliationStore {
  abstract record(
    id: string,
    evidence: FundingConversionFinancialReconciliationEvidence,
    recordedAt: Date,
  ): Promise<{
    reconciliation: StoredFundingConversionFinancialReconciliation;
    replayed: boolean;
  }>;
}

export interface AgenticWalletFundingConversionFinancialReconciliationReadStore {
  getByReconciliationId(
    reconciliationId: string,
  ): Promise<StoredFundingConversionFinancialReconciliation | null>;
}

export interface AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore {
  getByAttemptId(
    attemptId: string,
  ): Promise<StoredFundingConversionFinancialReconciliation | null>;
}

export class FundingConversionFinancialReconciliationBlockedError extends Error {
  constructor(
    readonly blockers: readonly FundingConversionFinancialReconciliationEvidenceBlocker[],
  ) {
    super('Funding conversion financial reconciliation is blocked');
  }
}

export class FundingConversionFinancialReconciliationConflictError extends Error {}
export class FundingConversionFinancialReconciliationContextNotFoundError extends Error {}
export class FundingConversionFinancialReconciliationIdentityError extends Error {
  constructor() {
    super('Funding conversion financial reconciliation identity is invalid');
    this.name = FundingConversionFinancialReconciliationIdentityError.name;
  }
}

export class FundingConversionFinancialReconciliationAttemptIdentityError extends Error {
  constructor() {
    super(
      'Funding conversion financial reconciliation attempt identity is invalid',
    );
    this.name =
      FundingConversionFinancialReconciliationAttemptIdentityError.name;
  }
}
