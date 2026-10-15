import Decimal from 'decimal.js';

import { AgenticWalletMarketSwapFinancialReconciliationCompletion } from './agentic-wallet-market-swap-financial-reconciliation-completion';
import { AgenticWalletMarketSwapProviderFeeComponent } from './agentic-wallet-market-swap-financial-reconciliation-evidence';

const ExactDecimal = Decimal.clone({
  precision: 80,
  rounding: Decimal.ROUND_DOWN,
});
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EVM_ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/;
const EVM_TRANSACTION_HASH_PATTERN = /^0x[0-9a-f]{64}$/;
const CANONICAL_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/;

export type AgenticWalletMarketSwapBalanceChange =
  | {
      readonly assetType: 'token';
      readonly assetAddress: string;
      readonly direction: 'debit' | 'credit';
      readonly beforeQuantity: string;
      readonly afterQuantity: string;
      readonly deltaQuantity: string;
    }
  | {
      readonly assetType: 'native';
      readonly assetSymbol: 'BNB';
      readonly direction: 'debit' | 'credit';
      readonly beforeQuantity: string;
      readonly afterQuantity: string;
      readonly deltaQuantity: string;
    };

export interface AgenticWalletMarketSwapAccountingBalanceEvidence {
  readonly scope: 'agentic_wallet_market_swap_accounting_balance_evidence';
  readonly completionEvidenceId: string;
  readonly gateId: string;
  readonly transactionHash: string;
  readonly balanceChanges: readonly AgenticWalletMarketSwapBalanceChange[];
  readonly coverageComplete: true;
  readonly observedAt: Date;
}

export type AgenticWalletMarketSwapAccountingBalanceEvidenceBlocker =
  | 'invalid_financial_reconciliation_completion'
  | 'invalid_accounting_balance_evidence'
  | 'accounting_evidence_identity_mismatch'
  | 'accounting_evidence_predates_completion'
  | 'source_balance_delta_missing_or_insufficient'
  | 'target_balance_delta_mismatch'
  | 'network_fee_balance_delta_missing_or_insufficient'
  | 'provider_fee_balance_delta_missing_or_insufficient';

export interface AgenticWalletMarketSwapAccountingBalanceEvidenceAssessment {
  readonly scope: 'agentic_wallet_market_swap_accounting_balance_evidence_assessment';
  readonly status: 'accounting_evidence_ready_for_persistence' | 'blocked';
  readonly blockers: readonly AgenticWalletMarketSwapAccountingBalanceEvidenceBlocker[];
  readonly evidence: AgenticWalletMarketSwapAccountingBalanceEvidence | null;
  readonly persistenceRequired: boolean;
  readonly financialReconciliationComplete: boolean;
  readonly accountingMutationRequired: boolean;
  readonly accountingMutationComplete: false;
  readonly submissionRetryAllowed: false;
}

export function assessAgenticWalletMarketSwapAccountingBalanceEvidence(
  completion: AgenticWalletMarketSwapFinancialReconciliationCompletion,
  evidence: AgenticWalletMarketSwapAccountingBalanceEvidence,
): AgenticWalletMarketSwapAccountingBalanceEvidenceAssessment {
  const blockers: AgenticWalletMarketSwapAccountingBalanceEvidenceBlocker[] =
    [];
  const completionValid = isValidCompletion(completion);
  const evidenceValid = isValidEvidence(evidence);
  addIf(
    blockers,
    !completionValid,
    'invalid_financial_reconciliation_completion',
  );
  addIf(blockers, !evidenceValid, 'invalid_accounting_balance_evidence');
  if (completionValid && evidenceValid) {
    addIf(
      blockers,
      evidence.completionEvidenceId !== completion.evidenceId ||
        evidence.gateId !== completion.gateId ||
        evidence.transactionHash !== completion.transactionHash,
      'accounting_evidence_identity_mismatch',
    );
    addIf(
      blockers,
      evidence.observedAt.getTime() < completion.evidenceRecordedAt.getTime(),
      'accounting_evidence_predates_completion',
    );

    const source = findTokenChange(
      evidence.balanceChanges,
      completion.sourceTokenAddress,
    );
    const sourceProviderFee = completion.providerFeeComponents.find(
      (fee) => fee.assetAddress === completion.sourceTokenAddress,
    )?.quantity;
    const requiredSourceDebit = decimal(
      completion.submittedSourceQuantity,
    ).plus(sourceProviderFee ?? '0');
    addIf(
      blockers,
      source === undefined ||
        source.direction !== 'debit' ||
        decimal(source.deltaQuantity).lessThan(requiredSourceDebit),
      'source_balance_delta_missing_or_insufficient',
    );

    const target = findTokenChange(
      evidence.balanceChanges,
      completion.targetTokenAddress,
    );
    addIf(
      blockers,
      target === undefined ||
        target.direction !== 'credit' ||
        target.deltaQuantity !== completion.actualReceivedQuantity,
      'target_balance_delta_mismatch',
    );

    const network = evidence.balanceChanges.find(
      (entry) => entry.assetType === 'native' && entry.assetSymbol === 'BNB',
    );
    addIf(
      blockers,
      network === undefined ||
        network.direction !== 'debit' ||
        decimal(network.deltaQuantity).lessThan(completion.networkFeeQuantity),
      'network_fee_balance_delta_missing_or_insufficient',
    );

    addIf(
      blockers,
      !providerFeesCovered(
        completion.providerFeeComponents,
        evidence.balanceChanges,
        completion.sourceTokenAddress,
        completion.targetTokenAddress,
      ),
      'provider_fee_balance_delta_missing_or_insufficient',
    );
  }

  if (blockers.length > 0) return result(blockers, null, completionValid);
  return result([], snapshot(evidence), true);
}

function isValidCompletion(
  value: AgenticWalletMarketSwapFinancialReconciliationCompletion,
): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.scope ===
      'agentic_wallet_market_swap_financial_reconciliation_completion' &&
    value.providerId === 'agentic_wallet' &&
    value.chainId === '56' &&
    UUID_PATTERN.test(value.evidenceId) &&
    UUID_PATTERN.test(value.gateId) &&
    UUID_PATTERN.test(value.statusObservationId) &&
    typeof value.providerOrderId === 'string' &&
    value.providerOrderId.length >= 1 &&
    value.providerOrderId.length <= 100 &&
    EVM_TRANSACTION_HASH_PATTERN.test(value.transactionHash) &&
    EVM_ADDRESS_PATTERN.test(value.sourceTokenAddress) &&
    EVM_ADDRESS_PATTERN.test(value.targetTokenAddress) &&
    value.sourceTokenAddress !== value.targetTokenAddress &&
    isPositiveDecimal(value.submittedSourceQuantity) &&
    isPositiveDecimal(value.actualReceivedQuantity) &&
    isValidProviderFees(value.providerFeeComponents) &&
    value.networkFeeAsset === 'BNB' &&
    isPositiveDecimal(value.networkFeeQuantity) &&
    value.evidenceObservedAt instanceof Date &&
    Number.isFinite(value.evidenceObservedAt.getTime()) &&
    value.evidenceRecordedAt instanceof Date &&
    Number.isFinite(value.evidenceRecordedAt.getTime()) &&
    value.evidenceRecordedAt.getTime() >= value.evidenceObservedAt.getTime() &&
    value.financialReconciliationRequired === true &&
    value.financialReconciliationComplete === true &&
    value.accountingMutationRequired === true &&
    value.accountingMutationComplete === false &&
    value.submissionRetryAllowed === false
  );
}

function isValidProviderFees(fees: unknown): boolean {
  if (!Array.isArray(fees) || fees.length > 10) return false;
  const addresses = new Set<string>();
  for (const value of fees as unknown[]) {
    if (typeof value !== 'object' || value === null) return false;
    const fee = value as Record<string, unknown>;
    const assetAddress = fee.assetAddress;
    if (
      typeof assetAddress !== 'string' ||
      !EVM_ADDRESS_PATTERN.test(assetAddress) ||
      !isNonNegativeDecimal(fee.quantity) ||
      addresses.has(assetAddress)
    )
      return false;
    addresses.add(assetAddress);
  }
  return true;
}

function isValidEvidence(
  value: AgenticWalletMarketSwapAccountingBalanceEvidence,
): boolean {
  if (
    typeof value !== 'object' ||
    value === null ||
    value.scope !== 'agentic_wallet_market_swap_accounting_balance_evidence' ||
    !UUID_PATTERN.test(value.completionEvidenceId) ||
    !UUID_PATTERN.test(value.gateId) ||
    !EVM_TRANSACTION_HASH_PATTERN.test(value.transactionHash) ||
    !Array.isArray(value.balanceChanges) ||
    value.balanceChanges.length < 1 ||
    value.balanceChanges.length > 20 ||
    value.coverageComplete !== true ||
    !(value.observedAt instanceof Date) ||
    !Number.isFinite(value.observedAt.getTime())
  )
    return false;

  const identities = new Set<string>();
  for (const raw of value.balanceChanges as unknown[]) {
    if (!isValidBalanceChange(raw)) return false;
    const entry = raw;
    const identity =
      entry.assetType === 'token'
        ? `token:${entry.assetAddress}`
        : `native:${entry.assetSymbol}`;
    if (identities.has(identity)) return false;
    identities.add(identity);
  }
  return true;
}

function isValidBalanceChange(
  value: unknown,
): value is AgenticWalletMarketSwapBalanceChange {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Record<string, unknown>;
  const assetType = entry.assetType;
  const assetAddress = entry.assetAddress;
  const assetSymbol = entry.assetSymbol;
  const direction = entry.direction;
  const beforeQuantity = entry.beforeQuantity;
  const afterQuantity = entry.afterQuantity;
  const deltaQuantity = entry.deltaQuantity;
  if (
    (assetType === 'token'
      ? typeof assetAddress !== 'string' ||
        !EVM_ADDRESS_PATTERN.test(assetAddress)
      : assetType !== 'native' || assetSymbol !== 'BNB') ||
    (direction !== 'debit' && direction !== 'credit') ||
    !isNonNegativeDecimal(beforeQuantity) ||
    !isNonNegativeDecimal(afterQuantity) ||
    !isPositiveDecimal(deltaQuantity)
  )
    return false;

  const before = decimal(beforeQuantity);
  const after = decimal(afterQuantity);
  const delta = decimal(deltaQuantity);
  return direction === 'debit'
    ? before.greaterThan(after) && before.minus(after).equals(delta)
    : after.greaterThan(before) && after.minus(before).equals(delta);
}

function providerFeesCovered(
  fees: readonly AgenticWalletMarketSwapProviderFeeComponent[],
  changes: readonly AgenticWalletMarketSwapBalanceChange[],
  sourceTokenAddress: string,
  targetTokenAddress: string,
): boolean {
  for (const fee of fees) {
    if (!isNonNegativeDecimal(fee.quantity)) return false;
    if (fee.quantity === '0') continue;
    const change = findTokenChange(changes, fee.assetAddress);
    if (change === undefined) return false;
    if (
      fee.assetAddress !== sourceTokenAddress &&
      fee.assetAddress !== targetTokenAddress &&
      (change.direction !== 'debit' ||
        decimal(change.deltaQuantity).lessThan(fee.quantity))
    )
      return false;
  }
  return true;
}

function findTokenChange(
  changes: readonly AgenticWalletMarketSwapBalanceChange[],
  assetAddress: string,
) {
  return changes.find(
    (entry) =>
      entry.assetType === 'token' && entry.assetAddress === assetAddress,
  );
}

function decimal(value: string): Decimal {
  return new ExactDecimal(value);
}

function isPositiveDecimal(value: unknown): value is string {
  return isNonNegativeDecimal(value) && value !== '0';
}

function isNonNegativeDecimal(value: unknown): value is string {
  return typeof value === 'string' && CANONICAL_DECIMAL_PATTERN.test(value);
}

function snapshot(
  evidence: AgenticWalletMarketSwapAccountingBalanceEvidence,
): AgenticWalletMarketSwapAccountingBalanceEvidence {
  return {
    ...evidence,
    balanceChanges: evidence.balanceChanges
      .map((entry) => ({ ...entry }))
      .sort((left, right) => identity(left).localeCompare(identity(right))),
    observedAt: new Date(evidence.observedAt),
  };
}

function identity(entry: AgenticWalletMarketSwapBalanceChange): string {
  return entry.assetType === 'token'
    ? `token:${entry.assetAddress}`
    : `native:${entry.assetSymbol}`;
}

function result(
  blockers: readonly AgenticWalletMarketSwapAccountingBalanceEvidenceBlocker[],
  evidence: AgenticWalletMarketSwapAccountingBalanceEvidence | null,
  completionValid: boolean,
): AgenticWalletMarketSwapAccountingBalanceEvidenceAssessment {
  return {
    scope: 'agentic_wallet_market_swap_accounting_balance_evidence_assessment',
    status:
      evidence === null
        ? 'blocked'
        : 'accounting_evidence_ready_for_persistence',
    blockers,
    evidence,
    persistenceRequired: evidence !== null,
    financialReconciliationComplete: completionValid,
    accountingMutationRequired: completionValid,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
  };
}

function addIf(
  blockers: AgenticWalletMarketSwapAccountingBalanceEvidenceBlocker[],
  condition: boolean,
  blocker: AgenticWalletMarketSwapAccountingBalanceEvidenceBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
