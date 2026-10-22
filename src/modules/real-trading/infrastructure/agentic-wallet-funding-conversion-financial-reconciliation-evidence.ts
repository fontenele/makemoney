import Decimal from 'decimal.js';

import type { StoredFundingConversionStatusObservation } from '../application/agentic-wallet-funding-conversion-status-observation.store';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';
import { isValidFundingConversionStatusObservation } from './agentic-wallet-funding-conversion-status-response';
import { isSafeAgenticWalletProviderOrderId } from './agentic-wallet-market-swap-submission-response';

const ExactDecimal = Decimal.clone({ precision: 80 });
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH_PATTERN = /^0x[a-f0-9]{64}$/;
const EVM_ADDRESS_PATTERN = /^0x[a-f0-9]{40}$/;
const CANONICAL_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/;

export interface FundingConversionFinancialReconciliationContext {
  readonly scope: 'agentic_wallet_funding_conversion_financial_reconciliation_context';
  readonly attemptId: string;
  readonly planId: string;
  readonly providerOrderId: string;
  readonly sourceQuantityBnb: string;
  readonly expectedUsdt: string;
  readonly minimumUsdt: string;
  readonly statusObservation: StoredFundingConversionStatusObservation;
}

export interface FundingConversionProviderFeeComponent {
  readonly assetAddress: string;
  readonly quantity: string;
}

export interface FundingConversionFinancialReconciliationEvidence {
  readonly scope: 'agentic_wallet_funding_conversion_financial_reconciliation_evidence';
  readonly attemptId: string;
  readonly providerOrderId: string;
  readonly statusObservationId: string;
  readonly transactionHash: string;
  readonly chainId: '56';
  readonly sourceTokenAddress: string;
  readonly targetTokenAddress: string;
  readonly submittedSourceQuantityBnb: string;
  readonly actualUsdtReceived: string;
  readonly providerFeeComponents: readonly FundingConversionProviderFeeComponent[];
  readonly networkFeeAsset: 'BNB';
  readonly networkFeeQuantityBnb: string;
  readonly transactionReceiptObserved: true;
  readonly sourceBalanceDeltaObserved: true;
  readonly targetBalanceDeltaObserved: true;
  readonly providerFeeCoverageComplete: true;
  readonly networkFeeCoverageComplete: true;
  readonly observedAt: Date;
}

export type FundingConversionOutputAssessment =
  | 'below_accepted_minimum'
  | 'minimum_satisfied_below_expected'
  | 'expected_output_satisfied';

export type FundingConversionFinancialReconciliationEvidenceBlocker =
  | 'invalid_reconciliation_context'
  | 'provider_execution_not_finished'
  | 'invalid_financial_evidence'
  | 'financial_evidence_identity_mismatch'
  | 'financial_evidence_transaction_mismatch'
  | 'financial_evidence_token_mismatch'
  | 'financial_evidence_source_quantity_mismatch'
  | 'financial_evidence_predates_status';

export interface FundingConversionFinancialReconciliationEvidenceAssessment {
  readonly scope: 'agentic_wallet_funding_conversion_financial_reconciliation_evidence_assessment';
  readonly status: 'evidence_ready_for_persistence' | 'blocked';
  readonly blockers: readonly FundingConversionFinancialReconciliationEvidenceBlocker[];
  readonly evidence: FundingConversionFinancialReconciliationEvidence | null;
  readonly actualUsdtReceived: string | null;
  readonly outputAssessment: FundingConversionOutputAssessment | null;
  readonly persistenceRequired: boolean;
  readonly financialReconciliationRequired: true;
  readonly financialReconciliationComplete: false;
  readonly automaticRetryAllowed: false;
}

export function assessFundingConversionFinancialReconciliationEvidence(
  context: FundingConversionFinancialReconciliationContext,
  evidence: FundingConversionFinancialReconciliationEvidence,
): FundingConversionFinancialReconciliationEvidenceAssessment {
  const blockers: FundingConversionFinancialReconciliationEvidenceBlocker[] =
    [];
  const contextValid = isValidContext(context);
  const evidenceValid = isValidEvidence(evidence);
  addIf(blockers, !contextValid, 'invalid_reconciliation_context');
  addIf(blockers, !evidenceValid, 'invalid_financial_evidence');

  if (contextValid) {
    addIf(
      blockers,
      context.statusObservation.observation.providerStatus !== 'FINISHED' ||
        !context.statusObservation.observation.terminal ||
        !context.statusObservation.observation.executionSucceeded ||
        context.statusObservation.observation.transactionHash === null,
      'provider_execution_not_finished',
    );
  }
  if (contextValid && evidenceValid) {
    const status = context.statusObservation;
    addIf(
      blockers,
      evidence.attemptId !== context.attemptId ||
        evidence.providerOrderId !== context.providerOrderId ||
        evidence.statusObservationId !== status.id,
      'financial_evidence_identity_mismatch',
    );
    addIf(
      blockers,
      evidence.transactionHash !== status.observation.transactionHash,
      'financial_evidence_transaction_mismatch',
    );
    addIf(
      blockers,
      evidence.sourceTokenAddress !== BSC_NATIVE_BNB_ADDRESS.toLowerCase() ||
        evidence.targetTokenAddress !== BSC_USDT_ADDRESS.toLowerCase(),
      'financial_evidence_token_mismatch',
    );
    addIf(
      blockers,
      evidence.submittedSourceQuantityBnb !== context.sourceQuantityBnb,
      'financial_evidence_source_quantity_mismatch',
    );
    addIf(
      blockers,
      evidence.observedAt.getTime() < status.recordedAt.getTime(),
      'financial_evidence_predates_status',
    );
  }

  if (blockers.length !== 0) return result(blockers, null, null);
  const actual = new ExactDecimal(evidence.actualUsdtReceived);
  const minimum = new ExactDecimal(context.minimumUsdt);
  const expected = new ExactDecimal(context.expectedUsdt);
  const outputAssessment: FundingConversionOutputAssessment = actual.lt(minimum)
    ? 'below_accepted_minimum'
    : actual.lt(expected)
      ? 'minimum_satisfied_below_expected'
      : 'expected_output_satisfied';
  return result([], snapshot(evidence), outputAssessment);
}

export function isValidFundingConversionFinancialReconciliationEvidence(
  evidence: unknown,
): evidence is FundingConversionFinancialReconciliationEvidence {
  return isValidEvidence(evidence);
}

function isValidContext(
  value: unknown,
): value is FundingConversionFinancialReconciliationContext {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const context = value as FundingConversionFinancialReconciliationContext;
  const status = context.statusObservation;
  return (
    context.scope ===
      'agentic_wallet_funding_conversion_financial_reconciliation_context' &&
    UUID_PATTERN.test(context.attemptId) &&
    UUID_PATTERN.test(context.planId) &&
    isSafeAgenticWalletProviderOrderId(context.providerOrderId) &&
    isCanonicalPositiveDecimal(context.sourceQuantityBnb) &&
    isCanonicalPositiveDecimal(context.expectedUsdt) &&
    isCanonicalPositiveDecimal(context.minimumUsdt) &&
    new ExactDecimal(context.minimumUsdt).lte(context.expectedUsdt) &&
    typeof status === 'object' &&
    status !== null &&
    UUID_PATTERN.test(status.id) &&
    isValidFundingConversionStatusObservation(status.observation) &&
    status.observation.attemptId === context.attemptId &&
    status.observation.providerOrderId === context.providerOrderId &&
    status.recordedAt instanceof Date &&
    Number.isFinite(status.recordedAt.getTime()) &&
    status.recordedAt.getTime() >=
      status.observation.providerUpdatedAt.getTime()
  );
}

function isValidEvidence(
  value: unknown,
): value is FundingConversionFinancialReconciliationEvidence {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const evidence = value as FundingConversionFinancialReconciliationEvidence;
  return (
    evidence.scope ===
      'agentic_wallet_funding_conversion_financial_reconciliation_evidence' &&
    UUID_PATTERN.test(evidence.attemptId) &&
    isSafeAgenticWalletProviderOrderId(evidence.providerOrderId) &&
    UUID_PATTERN.test(evidence.statusObservationId) &&
    HASH_PATTERN.test(evidence.transactionHash) &&
    evidence.chainId === '56' &&
    EVM_ADDRESS_PATTERN.test(evidence.sourceTokenAddress) &&
    EVM_ADDRESS_PATTERN.test(evidence.targetTokenAddress) &&
    isCanonicalPositiveDecimal(evidence.submittedSourceQuantityBnb) &&
    isCanonicalPositiveDecimal(evidence.actualUsdtReceived) &&
    validProviderFees(evidence.providerFeeComponents) &&
    evidence.networkFeeAsset === 'BNB' &&
    isCanonicalPositiveDecimal(evidence.networkFeeQuantityBnb) &&
    evidence.transactionReceiptObserved === true &&
    evidence.sourceBalanceDeltaObserved === true &&
    evidence.targetBalanceDeltaObserved === true &&
    evidence.providerFeeCoverageComplete === true &&
    evidence.networkFeeCoverageComplete === true &&
    evidence.observedAt instanceof Date &&
    Number.isFinite(evidence.observedAt.getTime())
  );
}

function validProviderFees(value: unknown): boolean {
  if (!Array.isArray(value) || value.length > 10) return false;
  const identities = new Set<string>();
  for (const entry of value as unknown[]) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry))
      return false;
    const fee = entry as Record<string, unknown>;
    if (
      typeof fee.assetAddress !== 'string' ||
      (fee.assetAddress !== BSC_NATIVE_BNB_ADDRESS.toLowerCase() &&
        fee.assetAddress !== BSC_USDT_ADDRESS.toLowerCase()) ||
      !isCanonicalNonNegativeDecimal(fee.quantity) ||
      identities.has(fee.assetAddress)
    )
      return false;
    identities.add(fee.assetAddress);
  }
  return true;
}

function isCanonicalPositiveDecimal(value: unknown): value is string {
  return isCanonicalNonNegativeDecimal(value) && value !== '0';
}

function isCanonicalNonNegativeDecimal(value: unknown): value is string {
  return typeof value === 'string' && CANONICAL_DECIMAL_PATTERN.test(value);
}

function snapshot(
  evidence: FundingConversionFinancialReconciliationEvidence,
): FundingConversionFinancialReconciliationEvidence {
  return {
    ...evidence,
    providerFeeComponents: evidence.providerFeeComponents
      .map((fee) => ({ ...fee }))
      .sort((left, right) =>
        left.assetAddress.localeCompare(right.assetAddress),
      ),
    observedAt: new Date(evidence.observedAt),
  };
}

function result(
  blockers: readonly FundingConversionFinancialReconciliationEvidenceBlocker[],
  evidence: FundingConversionFinancialReconciliationEvidence | null,
  outputAssessment: FundingConversionOutputAssessment | null,
): FundingConversionFinancialReconciliationEvidenceAssessment {
  return {
    scope:
      'agentic_wallet_funding_conversion_financial_reconciliation_evidence_assessment',
    status: evidence === null ? 'blocked' : 'evidence_ready_for_persistence',
    blockers,
    evidence,
    actualUsdtReceived: evidence?.actualUsdtReceived ?? null,
    outputAssessment,
    persistenceRequired: evidence !== null,
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    automaticRetryAllowed: false,
  };
}

function addIf(
  blockers: FundingConversionFinancialReconciliationEvidenceBlocker[],
  condition: boolean,
  blocker: FundingConversionFinancialReconciliationEvidenceBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
