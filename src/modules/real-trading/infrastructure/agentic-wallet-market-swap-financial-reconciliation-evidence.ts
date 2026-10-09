import { StoredRealExecutionSubmissionGate } from '../application/real-execution-submission-gate-store';
import { AgenticWalletMarketSwapReconciliationState } from './agentic-wallet-market-swap-reconciliation-state.store';
import { isStructurallyValidAgenticWalletMarketSwapGate } from './agentic-wallet-market-swap-command';
import { isValidAgenticWalletMarketSwapReconciliationState } from './agentic-wallet-market-swap-reconciliation-state.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EVM_ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/;
const EVM_TRANSACTION_HASH_PATTERN = /^0x[0-9a-f]{64}$/;
const CANONICAL_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/;

export interface AgenticWalletMarketSwapProviderFeeComponent {
  readonly assetAddress: string;
  readonly quantity: string;
}

export interface AgenticWalletMarketSwapFinancialReconciliationEvidence {
  readonly scope: 'agentic_wallet_market_swap_financial_reconciliation_evidence';
  readonly providerId: 'agentic_wallet';
  readonly chainId: '56';
  readonly gateId: string;
  readonly providerOrderId: string;
  readonly statusObservationId: string;
  readonly transactionHash: string;
  readonly sourceTokenAddress: string;
  readonly targetTokenAddress: string;
  readonly submittedSourceQuantity: string;
  readonly actualTargetReceivedQuantity: string;
  readonly providerFeeComponents: readonly AgenticWalletMarketSwapProviderFeeComponent[];
  readonly networkFeeAsset: 'BNB';
  readonly networkFeeQuantity: string;
  readonly transactionReceiptObserved: true;
  readonly targetBalanceDeltaObserved: true;
  readonly providerFeeCoverageComplete: true;
  readonly networkFeeCoverageComplete: true;
  readonly observedAt: Date;
}

export type AgenticWalletMarketSwapFinancialReconciliationEvidenceBlocker =
  | 'invalid_submission_gate'
  | 'invalid_reconciliation_state'
  | 'provider_execution_not_finished'
  | 'invalid_financial_evidence'
  | 'financial_evidence_identity_mismatch'
  | 'financial_evidence_transaction_mismatch'
  | 'financial_evidence_token_mismatch'
  | 'financial_evidence_source_quantity_mismatch'
  | 'financial_evidence_predates_status';

export interface AgenticWalletMarketSwapFinancialReconciliationEvidenceAssessment {
  readonly scope: 'agentic_wallet_market_swap_financial_reconciliation_evidence_assessment';
  readonly status: 'evidence_ready_for_persistence' | 'blocked';
  readonly blockers: readonly AgenticWalletMarketSwapFinancialReconciliationEvidenceBlocker[];
  readonly evidence: AgenticWalletMarketSwapFinancialReconciliationEvidence | null;
  readonly actualReceivedQuantity: string | null;
  readonly persistenceRequired: boolean;
  readonly financialReconciliationRequired: true;
  readonly financialReconciliationComplete: false;
  readonly submissionRetryAllowed: false;
}

export function assessAgenticWalletMarketSwapFinancialReconciliationEvidence(
  gate: StoredRealExecutionSubmissionGate,
  state: AgenticWalletMarketSwapReconciliationState,
  evidence: AgenticWalletMarketSwapFinancialReconciliationEvidence,
): AgenticWalletMarketSwapFinancialReconciliationEvidenceAssessment {
  const blockers: AgenticWalletMarketSwapFinancialReconciliationEvidenceBlocker[] =
    [];
  const gateValid = isStructurallyValidAgenticWalletMarketSwapGate(gate);
  const stateValid = isValidAgenticWalletMarketSwapReconciliationState(state);
  const evidenceValid = isValidEvidence(evidence);
  addIf(blockers, !gateValid, 'invalid_submission_gate');
  addIf(blockers, !stateValid, 'invalid_reconciliation_state');
  addIf(blockers, !evidenceValid, 'invalid_financial_evidence');

  if (stateValid) {
    addIf(
      blockers,
      state.phase !== 'provider_finished_financial_reconciliation_required' ||
        state.providerStatus !== 'FINISHED' ||
        !state.executionSucceeded ||
        !state.terminal,
      'provider_execution_not_finished',
    );
  }
  if (gateValid && stateValid) {
    addIf(
      blockers,
      gate.id !== state.gateId || gate.providerId !== state.providerId,
      'financial_evidence_identity_mismatch',
    );
  }
  if (gateValid && stateValid && evidenceValid) {
    addIf(
      blockers,
      evidence.gateId !== gate.id ||
        evidence.providerOrderId !== state.providerOrderId ||
        evidence.statusObservationId !== state.latestObservationId,
      'financial_evidence_identity_mismatch',
    );
    addIf(
      blockers,
      evidence.transactionHash !== state.transactionHash,
      'financial_evidence_transaction_mismatch',
    );
    addIf(
      blockers,
      evidence.chainId !== gate.chainId ||
        evidence.sourceTokenAddress !== gate.sourceTokenAddress ||
        evidence.targetTokenAddress !== gate.targetTokenAddress,
      'financial_evidence_token_mismatch',
    );
    addIf(
      blockers,
      evidence.submittedSourceQuantity !== gate.sourceQuantity,
      'financial_evidence_source_quantity_mismatch',
    );
    addIf(
      blockers,
      evidence.observedAt.getTime() <
        state.latestObservationRecordedAt!.getTime(),
      'financial_evidence_predates_status',
    );
  }

  if (blockers.length > 0) return result(blockers, null);
  return result([], snapshotEvidence(evidence));
}

function isValidEvidence(
  evidence: AgenticWalletMarketSwapFinancialReconciliationEvidence,
): boolean {
  return (
    typeof evidence === 'object' &&
    evidence !== null &&
    evidence.scope ===
      'agentic_wallet_market_swap_financial_reconciliation_evidence' &&
    evidence.providerId === 'agentic_wallet' &&
    evidence.chainId === '56' &&
    UUID_PATTERN.test(evidence.gateId) &&
    typeof evidence.providerOrderId === 'string' &&
    evidence.providerOrderId.length >= 1 &&
    evidence.providerOrderId.length <= 100 &&
    UUID_PATTERN.test(evidence.statusObservationId) &&
    EVM_TRANSACTION_HASH_PATTERN.test(evidence.transactionHash) &&
    EVM_ADDRESS_PATTERN.test(evidence.sourceTokenAddress) &&
    EVM_ADDRESS_PATTERN.test(evidence.targetTokenAddress) &&
    isCanonicalPositiveDecimal(evidence.submittedSourceQuantity) &&
    isCanonicalPositiveDecimal(evidence.actualTargetReceivedQuantity) &&
    isValidProviderFees(evidence.providerFeeComponents) &&
    evidence.networkFeeAsset === 'BNB' &&
    isCanonicalPositiveDecimal(evidence.networkFeeQuantity) &&
    evidence.transactionReceiptObserved === true &&
    evidence.targetBalanceDeltaObserved === true &&
    evidence.providerFeeCoverageComplete === true &&
    evidence.networkFeeCoverageComplete === true &&
    evidence.observedAt instanceof Date &&
    Number.isFinite(evidence.observedAt.getTime())
  );
}

function isValidProviderFees(fees: unknown): boolean {
  if (!Array.isArray(fees) || fees.length > 10) return false;
  const identities = new Set<string>();
  for (const value of fees as unknown[]) {
    if (typeof value !== 'object' || value === null) return false;
    const fee = value as Record<string, unknown>;
    const assetAddress = fee.assetAddress;
    if (
      typeof assetAddress !== 'string' ||
      !EVM_ADDRESS_PATTERN.test(assetAddress) ||
      !isCanonicalNonNegativeDecimal(fee.quantity) ||
      identities.has(assetAddress)
    )
      return false;
    identities.add(assetAddress);
  }
  return true;
}

function isCanonicalPositiveDecimal(value: unknown): value is string {
  return isCanonicalNonNegativeDecimal(value) && value !== '0';
}

function isCanonicalNonNegativeDecimal(value: unknown): value is string {
  return typeof value === 'string' && CANONICAL_DECIMAL_PATTERN.test(value);
}

function snapshotEvidence(
  evidence: AgenticWalletMarketSwapFinancialReconciliationEvidence,
): AgenticWalletMarketSwapFinancialReconciliationEvidence {
  return {
    ...evidence,
    providerFeeComponents: evidence.providerFeeComponents.map((fee) => ({
      ...fee,
    })),
    observedAt: new Date(evidence.observedAt),
  };
}

function result(
  blockers: readonly AgenticWalletMarketSwapFinancialReconciliationEvidenceBlocker[],
  evidence: AgenticWalletMarketSwapFinancialReconciliationEvidence | null,
): AgenticWalletMarketSwapFinancialReconciliationEvidenceAssessment {
  return {
    scope:
      'agentic_wallet_market_swap_financial_reconciliation_evidence_assessment',
    status: evidence === null ? 'blocked' : 'evidence_ready_for_persistence',
    blockers,
    evidence,
    actualReceivedQuantity: evidence?.actualTargetReceivedQuantity ?? null,
    persistenceRequired: evidence !== null,
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    submissionRetryAllowed: false,
  };
}

function addIf(
  blockers: AgenticWalletMarketSwapFinancialReconciliationEvidenceBlocker[],
  condition: boolean,
  blocker: AgenticWalletMarketSwapFinancialReconciliationEvidenceBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
