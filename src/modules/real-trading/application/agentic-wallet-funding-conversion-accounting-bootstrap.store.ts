import type {
  FundingConversionAccountingBootstrap,
  FundingConversionAccountingAbsenceEvidence,
} from './agentic-wallet-funding-conversion-accounting-bootstrap';
import type { FundingConversionAccountingSnapshot } from './agentic-wallet-funding-conversion-accounting-snapshot.reader';
import type { FundingConversionFinancialEvidenceContext } from './agentic-wallet-funding-conversion-financial-evidence-context.store';
import type { StoredFundingConversionFinancialReconciliation } from './agentic-wallet-funding-conversion-financial-reconciliation.store';

export interface FundingConversionAccountingBootstrapStoreRequest {
  readonly bootstrap: FundingConversionAccountingBootstrap;
  readonly reconciliation: StoredFundingConversionFinancialReconciliation;
  readonly context: FundingConversionFinancialEvidenceContext;
  readonly snapshot: FundingConversionAccountingSnapshot;
  readonly absence: FundingConversionAccountingAbsenceEvidence;
}

export interface AppliedFundingConversionAccountingBootstrap {
  readonly scope: 'applied_funding_conversion_accounting_bootstrap';
  readonly bootstrap: FundingConversionAccountingBootstrap;
  readonly initializationId: string;
  readonly appliedAt: Date;
  readonly accountingBalancesInitialized: true;
  readonly accountingBootstrapComplete: true;
  readonly ordinaryAccountingSynchronizationApplied: false;
  readonly historicalLedgerContinuityClaimed: false;
  readonly historicalBtcbContinuityClaimed: false;
  readonly strategyExecutionAuthorized: false;
  readonly automaticRetryAllowed: false;
}

export abstract class AgenticWalletFundingConversionAccountingBootstrapStore {
  abstract apply(
    request: FundingConversionAccountingBootstrapStoreRequest,
  ): Promise<{
    applied: AppliedFundingConversionAccountingBootstrap;
    replayed: boolean;
  }>;
}

export class FundingConversionAccountingBootstrapBlockedError extends Error {
  constructor(readonly blockers: readonly string[]) {
    super(
      `Funding conversion accounting bootstrap blocked: ${blockers.join(', ')}`,
    );
    this.name = FundingConversionAccountingBootstrapBlockedError.name;
  }
}

export class FundingConversionAccountingBootstrapConflictError extends Error {
  constructor() {
    super('Funding conversion accounting bootstrap already exists differently');
    this.name = FundingConversionAccountingBootstrapConflictError.name;
  }
}
