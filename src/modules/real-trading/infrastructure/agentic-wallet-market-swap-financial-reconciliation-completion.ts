import { AgenticWalletMarketSwapProviderFeeComponent } from './agentic-wallet-market-swap-financial-reconciliation-evidence';
import {
  StoredAgenticWalletMarketSwapFinancialReconciliationEvidence,
  isValidStoredAgenticWalletMarketSwapFinancialReconciliationEvidence,
} from './agentic-wallet-market-swap-financial-reconciliation-evidence.store';

export interface AgenticWalletMarketSwapFinancialReconciliationCompletion {
  readonly scope: 'agentic_wallet_market_swap_financial_reconciliation_completion';
  readonly evidenceId: string;
  readonly providerId: 'agentic_wallet';
  readonly chainId: '56';
  readonly gateId: string;
  readonly providerOrderId: string;
  readonly statusObservationId: string;
  readonly transactionHash: string;
  readonly sourceTokenAddress: string;
  readonly targetTokenAddress: string;
  readonly submittedSourceQuantity: string;
  readonly actualReceivedQuantity: string;
  readonly providerFeeComponents: readonly AgenticWalletMarketSwapProviderFeeComponent[];
  readonly networkFeeAsset: 'BNB';
  readonly networkFeeQuantity: string;
  readonly evidenceObservedAt: Date;
  readonly evidenceRecordedAt: Date;
  readonly financialReconciliationRequired: true;
  readonly financialReconciliationComplete: true;
  readonly accountingMutationRequired: true;
  readonly accountingMutationComplete: false;
  readonly submissionRetryAllowed: false;
}

export interface AgenticWalletMarketSwapFinancialReconciliationCompletionAssessment {
  readonly scope: 'agentic_wallet_market_swap_financial_reconciliation_completion_assessment';
  readonly status: 'financial_reconciliation_complete' | 'blocked';
  readonly blockers:
    readonly ['invalid_stored_financial_evidence'] | readonly [];
  readonly completion: AgenticWalletMarketSwapFinancialReconciliationCompletion | null;
  readonly financialReconciliationComplete: boolean;
  readonly accountingMutationRequired: boolean;
  readonly accountingMutationComplete: false;
  readonly submissionRetryAllowed: false;
}

export function assessAgenticWalletMarketSwapFinancialReconciliationCompletion(
  stored: StoredAgenticWalletMarketSwapFinancialReconciliationEvidence,
): AgenticWalletMarketSwapFinancialReconciliationCompletionAssessment {
  if (
    !isValidStoredAgenticWalletMarketSwapFinancialReconciliationEvidence(stored)
  ) {
    return {
      scope:
        'agentic_wallet_market_swap_financial_reconciliation_completion_assessment',
      status: 'blocked',
      blockers: ['invalid_stored_financial_evidence'],
      completion: null,
      financialReconciliationComplete: false,
      accountingMutationRequired: false,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    };
  }

  const evidence = stored.evidence;
  const completion: AgenticWalletMarketSwapFinancialReconciliationCompletion = {
    scope: 'agentic_wallet_market_swap_financial_reconciliation_completion',
    evidenceId: stored.id,
    providerId: evidence.providerId,
    chainId: evidence.chainId,
    gateId: evidence.gateId,
    providerOrderId: evidence.providerOrderId,
    statusObservationId: evidence.statusObservationId,
    transactionHash: evidence.transactionHash,
    sourceTokenAddress: evidence.sourceTokenAddress,
    targetTokenAddress: evidence.targetTokenAddress,
    submittedSourceQuantity: evidence.submittedSourceQuantity,
    actualReceivedQuantity: evidence.actualTargetReceivedQuantity,
    providerFeeComponents: evidence.providerFeeComponents.map((fee) => ({
      ...fee,
    })),
    networkFeeAsset: evidence.networkFeeAsset,
    networkFeeQuantity: evidence.networkFeeQuantity,
    evidenceObservedAt: new Date(evidence.observedAt),
    evidenceRecordedAt: new Date(stored.recordedAt),
    financialReconciliationRequired: true,
    financialReconciliationComplete: true,
    accountingMutationRequired: true,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
  };
  return {
    scope:
      'agentic_wallet_market_swap_financial_reconciliation_completion_assessment',
    status: 'financial_reconciliation_complete',
    blockers: [],
    completion,
    financialReconciliationComplete: true,
    accountingMutationRequired: true,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
  };
}
