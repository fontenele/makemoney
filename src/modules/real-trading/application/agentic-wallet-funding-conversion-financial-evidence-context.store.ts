import type { FundingConversionFinancialReconciliationContext } from '../infrastructure/agentic-wallet-funding-conversion-financial-reconciliation-evidence';

export interface FundingConversionFinancialEvidenceContext {
  readonly reconciliation: FundingConversionFinancialReconciliationContext;
  readonly walletAddress: string;
  readonly preBalanceBlockNumber: string;
  readonly preBnbBalance: string;
  readonly preUsdtBalance: string;
  readonly preBalanceObservedAt: Date;
  readonly providerFeeRate: string;
  readonly providerFeeUsd: string;
  readonly feeEvidenceObservedAt: Date;
}

export abstract class AgenticWalletFundingConversionFinancialEvidenceContextStore {
  abstract getByAttemptId(
    attemptId: string,
  ): Promise<FundingConversionFinancialEvidenceContext | null>;
}
