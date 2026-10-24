import type { FundingConversionAccountingSnapshot } from './agentic-wallet-funding-conversion-accounting-snapshot.reader';
import type { FundingConversionFinancialEvidenceContext } from './agentic-wallet-funding-conversion-financial-evidence-context.store';
import type { StoredFundingConversionFinancialReconciliation } from './agentic-wallet-funding-conversion-financial-reconciliation.store';

export const FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT =
  'reconciled_conversion_and_exact_wallet_balances_reviewed_for_local_ledger_synchronization' as const;

export interface FundingConversionAccountingSyncRequest {
  readonly id: string;
  readonly initializationId: string;
  readonly reconciliation: StoredFundingConversionFinancialReconciliation;
  readonly context: FundingConversionFinancialEvidenceContext;
  readonly snapshot: FundingConversionAccountingSnapshot;
  readonly acknowledgment: typeof FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT;
  readonly preparedAt: Date;
}

export interface FundingConversionAccountingSyncBalance {
  readonly assetIdentity: string;
  readonly beforeQuantity: string;
  readonly afterQuantity: string;
}

export interface AppliedFundingConversionAccountingSync {
  readonly scope: 'applied_funding_conversion_accounting_sync';
  readonly id: string;
  readonly initializationId: string;
  readonly reconciliationId: string;
  readonly attemptId: string;
  readonly transactionHash: string;
  readonly walletAddress: string;
  readonly blockNumber: string;
  readonly acknowledgment: typeof FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT;
  readonly balances: readonly FundingConversionAccountingSyncBalance[];
  readonly observedAt: Date;
  readonly preparedAt: Date;
  readonly appliedAt: Date;
  readonly financialReconciliationComplete: true;
  readonly accountingSynchronizationComplete: true;
  readonly automaticRetryAllowed: false;
}

export abstract class AgenticWalletFundingConversionAccountingSyncStore {
  abstract getByAttemptId(
    attemptId: string,
  ): Promise<AppliedFundingConversionAccountingSync | null>;

  abstract apply(request: FundingConversionAccountingSyncRequest): Promise<{
    synchronized: AppliedFundingConversionAccountingSync;
    replayed: boolean;
  }>;
}

export class FundingConversionAccountingSyncBlockedError extends Error {
  constructor(readonly blockers: readonly string[]) {
    super(
      `Funding conversion accounting synchronization blocked: ${blockers.join(', ')}`,
    );
    this.name = FundingConversionAccountingSyncBlockedError.name;
  }
}

export class FundingConversionAccountingSyncConflictError extends Error {
  constructor() {
    super(
      'Funding conversion accounting synchronization already exists differently',
    );
    this.name = FundingConversionAccountingSyncConflictError.name;
  }
}
