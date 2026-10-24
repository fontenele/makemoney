import Decimal from 'decimal.js';

import { AgenticWalletFundingConversionFinancialEvidenceContextStore } from '../application/agentic-wallet-funding-conversion-financial-evidence-context.store';
import {
  AgenticWalletFundingConversionFinancialEvidenceReader,
  FundingConversionFinancialEvidenceReadResult,
} from '../application/agentic-wallet-funding-conversion-financial-evidence.reader';
import { AgenticWalletFundingConversionPostBalanceReader } from '../application/agentic-wallet-funding-conversion-post-balance.reader';
import { AgenticWalletFundingConversionTransactionReceiptReader } from '../application/agentic-wallet-funding-conversion-transaction-receipt.reader';
import { isValidFundingConversionFinancialReconciliationEvidence } from './agentic-wallet-funding-conversion-financial-reconciliation-evidence';

const ExactDecimal = Decimal.clone({
  precision: 80,
  toExpNeg: -80,
  toExpPos: 80,
});
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class FundingConversionFinancialEvidenceInvalidError extends Error {}

export class AgenticWalletFundingConversionCompleteFinancialEvidenceReader extends AgenticWalletFundingConversionFinancialEvidenceReader {
  constructor(
    private readonly contexts: AgenticWalletFundingConversionFinancialEvidenceContextStore,
    private readonly receipts: AgenticWalletFundingConversionTransactionReceiptReader,
    private readonly postBalances: AgenticWalletFundingConversionPostBalanceReader,
  ) {
    super();
  }

  async load(
    attemptId: string,
    signal?: AbortSignal,
  ): Promise<FundingConversionFinancialEvidenceReadResult> {
    if (!UUID_PATTERN.test(attemptId)) throw invalid();
    if (signal?.aborted) throw signal.reason;
    const context = await this.contexts.getByAttemptId(attemptId);
    if (context === null)
      return {
        status: 'evidence_unavailable',
        blockers: ['terminal_funding_conversion_context_unavailable'],
      };
    const status = context.reconciliation.statusObservation;
    const transactionHash = status.observation.transactionHash;
    if (transactionHash === null) throw invalid();

    const receipt = await this.receipts.load(transactionHash, signal);
    if (signal?.aborted) throw signal.reason;
    const post = await this.postBalances.load(context.walletAddress, signal);
    if (
      receipt.transactionHash !== transactionHash ||
      receipt.walletAddress !== context.walletAddress ||
      post.walletAddress !== context.walletAddress ||
      receipt.chainId !== '56' ||
      post.chainId !== '56' ||
      BigInt(post.blockNumber) <= BigInt(context.preBalanceBlockNumber) ||
      receipt.observedAt.getTime() < status.recordedAt.getTime() ||
      post.observedAt.getTime() < receipt.observedAt.getTime() ||
      receipt.transactionTime.getTime() > receipt.observedAt.getTime() ||
      !equal(
        receipt.sourceQuantityBnb,
        context.reconciliation.sourceQuantityBnb,
      )
    )
      throw invalid();

    const sourceDelta = new ExactDecimal(context.preBnbBalance).minus(
      post.bnbBalance,
    );
    const expectedSourceDelta = new ExactDecimal(
      context.reconciliation.sourceQuantityBnb,
    ).plus(receipt.networkFeeQuantityBnb);
    const targetDelta = new ExactDecimal(post.usdtBalance).minus(
      context.preUsdtBalance,
    );
    if (
      !sourceDelta.equals(expectedSourceDelta) ||
      !targetDelta.equals(receipt.actualUsdtReceived) ||
      !sourceDelta.isPositive() ||
      !targetDelta.isPositive() ||
      context.providerFeeRate !== '0' ||
      context.providerFeeUsd !== '0'
    )
      throw invalid();

    const evidence = {
      scope:
        'agentic_wallet_funding_conversion_financial_reconciliation_evidence' as const,
      attemptId,
      providerOrderId: context.reconciliation.providerOrderId,
      statusObservationId: status.id,
      transactionHash,
      chainId: '56' as const,
      sourceTokenAddress: receipt.sourceTokenAddress,
      targetTokenAddress: receipt.targetTokenAddress,
      submittedSourceQuantityBnb: context.reconciliation.sourceQuantityBnb,
      actualUsdtReceived: receipt.actualUsdtReceived,
      providerFeeComponents: [],
      networkFeeAsset: 'BNB' as const,
      networkFeeQuantityBnb: receipt.networkFeeQuantityBnb,
      transactionReceiptObserved: true as const,
      sourceBalanceDeltaObserved: true as const,
      targetBalanceDeltaObserved: true as const,
      providerFeeCoverageComplete: true as const,
      networkFeeCoverageComplete: true as const,
      observedAt: new Date(post.observedAt),
    };
    if (!isValidFundingConversionFinancialReconciliationEvidence(evidence))
      throw invalid();
    return { status: 'evidence_available', evidence };
  }
}

function equal(left: string, right: string): boolean {
  try {
    return new ExactDecimal(left).equals(right);
  } catch {
    return false;
  }
}

function invalid(): FundingConversionFinancialEvidenceInvalidError {
  return new FundingConversionFinancialEvidenceInvalidError(
    'Funding conversion complete financial evidence is invalid',
  );
}
