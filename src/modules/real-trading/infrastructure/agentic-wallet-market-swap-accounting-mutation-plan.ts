import { AgenticWalletMarketSwapBalanceChange } from './agentic-wallet-market-swap-accounting-balance-evidence';
import {
  StoredAgenticWalletMarketSwapAccountingBalanceEvidence,
  isValidStoredAgenticWalletMarketSwapAccountingBalanceEvidence,
} from './agentic-wallet-market-swap-accounting-balance-evidence.store';

export interface AgenticWalletMarketSwapAccountingMutationPlan {
  readonly scope: 'agentic_wallet_market_swap_accounting_mutation_plan';
  readonly accountingEvidenceId: string;
  readonly completionEvidenceId: string;
  readonly gateId: string;
  readonly transactionHash: string;
  readonly balanceTransitions: readonly AgenticWalletMarketSwapBalanceChange[];
  readonly evidenceObservedAt: Date;
  readonly evidenceRecordedAt: Date;
  readonly financialReconciliationComplete: true;
  readonly accountingMutationRequired: true;
  readonly accountingMutationAuthorized: false;
  readonly accountingMutationComplete: false;
  readonly submissionRetryAllowed: false;
}

export interface AgenticWalletMarketSwapAccountingMutationPlanAssessment {
  readonly scope: 'agentic_wallet_market_swap_accounting_mutation_plan_assessment';
  readonly status: 'accounting_mutation_plan_ready' | 'blocked';
  readonly blockers:
    readonly ['invalid_stored_accounting_balance_evidence'] | readonly [];
  readonly plan: AgenticWalletMarketSwapAccountingMutationPlan | null;
  readonly financialReconciliationComplete: boolean;
  readonly accountingMutationRequired: boolean;
  readonly accountingMutationAuthorized: false;
  readonly accountingMutationComplete: false;
  readonly submissionRetryAllowed: false;
}

export function assessAgenticWalletMarketSwapAccountingMutationPlan(
  stored: StoredAgenticWalletMarketSwapAccountingBalanceEvidence,
): AgenticWalletMarketSwapAccountingMutationPlanAssessment {
  if (!isValidStoredAgenticWalletMarketSwapAccountingBalanceEvidence(stored)) {
    return {
      scope: 'agentic_wallet_market_swap_accounting_mutation_plan_assessment',
      status: 'blocked',
      blockers: ['invalid_stored_accounting_balance_evidence'],
      plan: null,
      financialReconciliationComplete: false,
      accountingMutationRequired: false,
      accountingMutationAuthorized: false,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    };
  }

  const evidence = stored.evidence;
  return {
    scope: 'agentic_wallet_market_swap_accounting_mutation_plan_assessment',
    status: 'accounting_mutation_plan_ready',
    blockers: [],
    plan: {
      scope: 'agentic_wallet_market_swap_accounting_mutation_plan',
      accountingEvidenceId: stored.id,
      completionEvidenceId: evidence.completionEvidenceId,
      gateId: evidence.gateId,
      transactionHash: evidence.transactionHash,
      balanceTransitions: evidence.balanceChanges
        .map((transition) => ({ ...transition }))
        .sort((left, right) =>
          balanceIdentity(left).localeCompare(balanceIdentity(right)),
        ),
      evidenceObservedAt: new Date(evidence.observedAt),
      evidenceRecordedAt: new Date(stored.recordedAt),
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationAuthorized: false,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    },
    financialReconciliationComplete: true,
    accountingMutationRequired: true,
    accountingMutationAuthorized: false,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
  };
}

function balanceIdentity(
  transition: AgenticWalletMarketSwapBalanceChange,
): string {
  return transition.assetType === 'token'
    ? `token:${transition.assetAddress}`
    : `native:${transition.assetSymbol}`;
}
