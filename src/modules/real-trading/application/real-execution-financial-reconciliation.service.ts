import {
  AgenticWalletMarketSwapFinancialReconciliationCompletion,
  assessAgenticWalletMarketSwapFinancialReconciliationCompletion,
} from '../infrastructure/agentic-wallet-market-swap-financial-reconciliation-completion';
import {
  AgenticWalletMarketSwapFinancialReconciliationEvidence,
  isValidAgenticWalletMarketSwapFinancialReconciliationEvidence,
} from '../infrastructure/agentic-wallet-market-swap-financial-reconciliation-evidence';
import { AgenticWalletMarketSwapFinancialReconciliationEvidenceStore } from '../infrastructure/agentic-wallet-market-swap-financial-reconciliation-evidence.store';

const REQUEST_KEYS = [
  'scope',
  'providerId',
  'chainId',
  'gateId',
  'providerOrderId',
  'statusObservationId',
  'transactionHash',
  'sourceTokenAddress',
  'targetTokenAddress',
  'submittedSourceQuantity',
  'actualTargetReceivedQuantity',
  'providerFeeComponents',
  'networkFeeAsset',
  'networkFeeQuantity',
  'transactionReceiptObserved',
  'targetBalanceDeltaObserved',
  'providerFeeCoverageComplete',
  'networkFeeCoverageComplete',
  'observedAt',
] as const;

export interface RealExecutionFinancialReconciliationResult {
  readonly scope: 'real_execution_financial_reconciliation';
  readonly status: 'financial_reconciliation_complete';
  readonly completion: AgenticWalletMarketSwapFinancialReconciliationCompletion;
  readonly replayed: boolean;
  readonly providerCallStarted: false;
  readonly financialReconciliationComplete: true;
  readonly accountingMutationRequired: true;
  readonly accountingMutationComplete: false;
  readonly submissionRetryAllowed: false;
}

export class InvalidRealExecutionFinancialReconciliationRequestError extends Error {
  constructor() {
    super('Invalid real execution financial reconciliation request');
    this.name = InvalidRealExecutionFinancialReconciliationRequestError.name;
  }
}

export class RealExecutionFinancialReconciliationService {
  constructor(
    private readonly evidenceStore: AgenticWalletMarketSwapFinancialReconciliationEvidenceStore,
  ) {}

  async reconcile(
    input: unknown,
  ): Promise<RealExecutionFinancialReconciliationResult> {
    const evidence = parseEvidence(input);
    const recorded = await this.evidenceStore.record(evidence);
    const assessment =
      assessAgenticWalletMarketSwapFinancialReconciliationCompletion(
        recorded.stored,
      );
    if (assessment.completion === null)
      throw new Error('Stored financial reconciliation evidence is invalid');

    return {
      scope: 'real_execution_financial_reconciliation',
      status: 'financial_reconciliation_complete',
      completion: assessment.completion,
      replayed: recorded.replayed,
      providerCallStarted: false,
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    };
  }
}

function parseEvidence(
  input: unknown,
): AgenticWalletMarketSwapFinancialReconciliationEvidence {
  if (!isExactRecord(input))
    throw new InvalidRealExecutionFinancialReconciliationRequestError();
  const observedAt = parseCanonicalDate(input.observedAt);
  const evidence = {
    ...input,
    observedAt,
  } as unknown as AgenticWalletMarketSwapFinancialReconciliationEvidence;
  if (
    observedAt === null ||
    !isValidAgenticWalletMarketSwapFinancialReconciliationEvidence(evidence)
  )
    throw new InvalidRealExecutionFinancialReconciliationRequestError();
  return {
    ...evidence,
    providerFeeComponents: evidence.providerFeeComponents.map((fee) => ({
      ...fee,
    })),
    observedAt: new Date(evidence.observedAt),
  };
}

function isExactRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const keys = Object.keys(value);
  return (
    keys.length === REQUEST_KEYS.length &&
    REQUEST_KEYS.every((key) => Object.hasOwn(value, key))
  );
}

function parseCanonicalDate(value: unknown): Date | null {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString() === value
    ? date
    : null;
}
