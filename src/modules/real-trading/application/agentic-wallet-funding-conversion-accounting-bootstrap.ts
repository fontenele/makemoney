import Decimal from 'decimal.js';

import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import type { FundingConversionAccountingSnapshot } from './agentic-wallet-funding-conversion-accounting-snapshot.reader';
import type { FundingConversionFinancialEvidenceContext } from './agentic-wallet-funding-conversion-financial-evidence-context.store';
import type { StoredFundingConversionFinancialReconciliation } from './agentic-wallet-funding-conversion-financial-reconciliation.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const ADDRESS_PATTERN = /^0x[0-9a-f]{40}$/;
const BLOCK_PATTERN = /^0x(?:0|[1-9a-f][0-9a-f]*)$/;
const HASH_PATTERN = /^0x[0-9a-f]{64}$/;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/;
const MAXIMUM_SNAPSHOT_AGE_MS = 60_000;
const ExactDecimal = Decimal.clone({ precision: 80 });

export const FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT =
  'reconciled_conversion_and_current_wallet_balances_reviewed_for_accounting_bootstrap' as const;

export interface FundingConversionAccountingAbsenceEvidence {
  readonly scope: 'funding_conversion_accounting_absence_evidence';
  readonly initializationCount: number;
  readonly balanceCount: number;
  readonly synchronizationCount: number;
  readonly inspectedAt: Date;
}

export interface FundingConversionAccountingBootstrapRequest {
  readonly bootstrapId: string;
  readonly acknowledgment: typeof FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT;
  readonly maximumSnapshotAgeMs: number;
  readonly preparedAt: Date;
}

export interface FundingConversionAccountingBootstrapBalance {
  readonly assetIdentity: string;
  readonly assetType: 'native' | 'token';
  readonly assetAddress: string | null;
  readonly assetSymbol: string | null;
  readonly currentQuantity: string;
}

export interface FundingConversionAccountingBootstrap {
  readonly scope: 'agentic_wallet_funding_conversion_accounting_bootstrap';
  readonly bootstrapId: string;
  readonly reconciliationId: string;
  readonly attemptId: string;
  readonly transactionHash: string;
  readonly chainId: '56';
  readonly walletAddress: string;
  readonly blockNumber: string;
  readonly balances: readonly FundingConversionAccountingBootstrapBalance[];
  readonly acknowledgment: typeof FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT;
  readonly reason: 'post_reconciliation_missing_preexisting_ledger';
  readonly walletObservedAt: Date;
  readonly accountingStateInspectedAt: Date;
  readonly maximumSnapshotAgeMs: number;
  readonly preparedAt: Date;
  readonly financialReconciliationComplete: true;
  readonly postConversionStateVerified: true;
  readonly historicalLedgerContinuityClaimed: false;
  readonly historicalBtcbContinuityClaimed: false;
  readonly accountingBootstrapPrepared: true;
  readonly accountingBalancesInitialized: false;
  readonly accountingSynchronizationComplete: false;
  readonly strategyExecutionAuthorized: false;
  readonly automaticRetryAllowed: false;
}

export type FundingConversionAccountingBootstrapBlocker =
  | 'invalid_financial_reconciliation'
  | 'invalid_conversion_context'
  | 'invalid_wallet_snapshot'
  | 'invalid_accounting_absence_evidence'
  | 'invalid_bootstrap_request'
  | 'bootstrap_acknowledgment_missing'
  | 'accounting_state_not_empty'
  | 'conversion_identity_mismatch'
  | 'wallet_snapshot_not_after_preconversion'
  | 'wallet_snapshot_chronology_mismatch'
  | 'wallet_snapshot_from_future'
  | 'wallet_snapshot_stale'
  | 'post_conversion_balance_equation_mismatch';

export interface FundingConversionAccountingBootstrapAssessment {
  readonly scope: 'agentic_wallet_funding_conversion_accounting_bootstrap_assessment';
  readonly status: 'accounting_bootstrap_ready' | 'blocked';
  readonly blockers: readonly FundingConversionAccountingBootstrapBlocker[];
  readonly bootstrap: FundingConversionAccountingBootstrap | null;
  readonly historicalLedgerContinuityClaimed: false;
  readonly historicalBtcbContinuityClaimed: false;
  readonly accountingBalancesInitialized: false;
  readonly accountingSynchronizationComplete: false;
  readonly strategyExecutionAuthorized: false;
  readonly automaticRetryAllowed: false;
}

export function prepareFundingConversionAccountingBootstrap(
  reconciliation: StoredFundingConversionFinancialReconciliation,
  context: FundingConversionFinancialEvidenceContext,
  snapshot: FundingConversionAccountingSnapshot,
  absence: FundingConversionAccountingAbsenceEvidence,
  request: FundingConversionAccountingBootstrapRequest,
): FundingConversionAccountingBootstrapAssessment {
  const blockers: FundingConversionAccountingBootstrapBlocker[] = [];
  const reconciliationValid = isValidReconciliation(reconciliation);
  const contextValid = isValidContext(context);
  const snapshotBalances = validSnapshotBalances(snapshot);
  const snapshotValid = snapshotBalances !== null;
  const absenceValid = isValidAbsence(absence);
  const requestValid = isValidRequest(request);
  addIf(blockers, !reconciliationValid, 'invalid_financial_reconciliation');
  addIf(blockers, !contextValid, 'invalid_conversion_context');
  addIf(blockers, !snapshotValid, 'invalid_wallet_snapshot');
  addIf(blockers, !absenceValid, 'invalid_accounting_absence_evidence');
  addIf(blockers, !requestValid, 'invalid_bootstrap_request');
  addIf(
    blockers,
    request?.acknowledgment !==
      FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT,
    'bootstrap_acknowledgment_missing',
  );

  if (absenceValid)
    addIf(
      blockers,
      absence.initializationCount !== 0 ||
        absence.balanceCount !== 0 ||
        absence.synchronizationCount !== 0,
      'accounting_state_not_empty',
    );

  if (
    reconciliationValid &&
    contextValid &&
    snapshotValid &&
    absenceValid &&
    requestValid
  ) {
    addIf(
      blockers,
      reconciliation.attemptId !== context.reconciliation.attemptId ||
        reconciliation.planId !== context.reconciliation.planId ||
        reconciliation.evidence.providerOrderId !==
          context.reconciliation.providerOrderId ||
        reconciliation.evidence.submittedSourceQuantityBnb !==
          context.reconciliation.sourceQuantityBnb ||
        reconciliation.expectedUsdt !== context.reconciliation.expectedUsdt ||
        reconciliation.minimumUsdt !== context.reconciliation.minimumUsdt ||
        reconciliation.evidence.statusObservationId !==
          context.reconciliation.statusObservation.id ||
        reconciliation.evidence.transactionHash !==
          context.reconciliation.statusObservation.observation
            .transactionHash ||
        reconciliation.evidence.chainId !== snapshot.chainId ||
        snapshot.walletAddress !== context.walletAddress,
      'conversion_identity_mismatch',
    );
    addIf(
      blockers,
      BigInt(snapshot.blockNumber) <= BigInt(context.preBalanceBlockNumber),
      'wallet_snapshot_not_after_preconversion',
    );
    addIf(
      blockers,
      snapshot.observedAt.getTime() < reconciliation.recordedAt.getTime() ||
        snapshot.observedAt.getTime() < context.preBalanceObservedAt.getTime(),
      'wallet_snapshot_chronology_mismatch',
    );
    const ageMs = request.preparedAt.getTime() - snapshot.observedAt.getTime();
    addIf(blockers, ageMs < 0, 'wallet_snapshot_from_future');
    addIf(
      blockers,
      ageMs > request.maximumSnapshotAgeMs,
      'wallet_snapshot_stale',
    );
    addIf(
      blockers,
      request.preparedAt.getTime() < absence.inspectedAt.getTime(),
      'invalid_bootstrap_request',
    );
    const expectedBnb = new ExactDecimal(context.preBnbBalance)
      .minus(reconciliation.evidence.submittedSourceQuantityBnb)
      .minus(reconciliation.evidence.networkFeeQuantityBnb);
    const expectedUsdt = new ExactDecimal(context.preUsdtBalance).plus(
      reconciliation.evidence.actualUsdtReceived,
    );
    addIf(
      blockers,
      expectedBnb.isNegative() ||
        snapshotBalances.get('native:BNB')?.currentQuantity !==
          expectedBnb.toFixed() ||
        snapshotBalances.get(requiredUsdtIdentity())?.currentQuantity !==
          expectedUsdt.toFixed(),
      'post_conversion_balance_equation_mismatch',
    );
  }

  const bootstrap =
    blockers.length === 0 && snapshotBalances !== null
      ? buildBootstrap(
          reconciliation,
          snapshot,
          absence,
          request,
          snapshotBalances,
        )
      : null;
  return {
    scope: 'agentic_wallet_funding_conversion_accounting_bootstrap_assessment',
    status: bootstrap === null ? 'blocked' : 'accounting_bootstrap_ready',
    blockers,
    bootstrap,
    historicalLedgerContinuityClaimed: false,
    historicalBtcbContinuityClaimed: false,
    accountingBalancesInitialized: false,
    accountingSynchronizationComplete: false,
    strategyExecutionAuthorized: false,
    automaticRetryAllowed: false,
  };
}

function buildBootstrap(
  reconciliation: StoredFundingConversionFinancialReconciliation,
  snapshot: FundingConversionAccountingSnapshot,
  absence: FundingConversionAccountingAbsenceEvidence,
  request: FundingConversionAccountingBootstrapRequest,
  balances: ReadonlyMap<string, FundingConversionAccountingBootstrapBalance>,
): FundingConversionAccountingBootstrap {
  return {
    scope: 'agentic_wallet_funding_conversion_accounting_bootstrap',
    bootstrapId: request.bootstrapId,
    reconciliationId: reconciliation.id,
    attemptId: reconciliation.attemptId,
    transactionHash: reconciliation.evidence.transactionHash,
    chainId: '56',
    walletAddress: snapshot.walletAddress,
    blockNumber: snapshot.blockNumber,
    balances: [...balances.values()].sort((left, right) =>
      left.assetIdentity.localeCompare(right.assetIdentity),
    ),
    acknowledgment: FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT,
    reason: 'post_reconciliation_missing_preexisting_ledger',
    walletObservedAt: new Date(snapshot.observedAt),
    accountingStateInspectedAt: new Date(absence.inspectedAt),
    maximumSnapshotAgeMs: request.maximumSnapshotAgeMs,
    preparedAt: new Date(request.preparedAt),
    financialReconciliationComplete: true,
    postConversionStateVerified: true,
    historicalLedgerContinuityClaimed: false,
    historicalBtcbContinuityClaimed: false,
    accountingBootstrapPrepared: true,
    accountingBalancesInitialized: false,
    accountingSynchronizationComplete: false,
    strategyExecutionAuthorized: false,
    automaticRetryAllowed: false,
  };
}

function isValidReconciliation(
  value: unknown,
): value is StoredFundingConversionFinancialReconciliation {
  if (!isRecord(value) || !isRecord(value.evidence)) return false;
  return (
    UUID_PATTERN.test(string(value.id)) &&
    UUID_PATTERN.test(string(value.attemptId)) &&
    UUID_PATTERN.test(string(value.planId)) &&
    value.financialReconciliationComplete === true &&
    value.automaticRetryAllowed === false &&
    isDecimal(value.expectedUsdt) &&
    isDecimal(value.minimumUsdt) &&
    value.recordedAt instanceof Date &&
    Number.isFinite(value.recordedAt.getTime()) &&
    value.evidence.attemptId === value.attemptId &&
    UUID_PATTERN.test(string(value.evidence.statusObservationId)) &&
    value.evidence.chainId === '56' &&
    typeof value.evidence.providerOrderId === 'string' &&
    value.evidence.providerOrderId.length > 0 &&
    HASH_PATTERN.test(string(value.evidence.transactionHash)) &&
    isDecimal(value.evidence.submittedSourceQuantityBnb) &&
    isDecimal(value.evidence.actualUsdtReceived) &&
    isDecimal(value.evidence.networkFeeQuantityBnb) &&
    value.evidence.observedAt instanceof Date &&
    Number.isFinite(value.evidence.observedAt.getTime())
  );
}

function isValidContext(
  value: unknown,
): value is FundingConversionFinancialEvidenceContext {
  if (!isRecord(value) || !isRecord(value.reconciliation)) return false;
  return (
    UUID_PATTERN.test(string(value.reconciliation.attemptId)) &&
    UUID_PATTERN.test(string(value.reconciliation.planId)) &&
    typeof value.reconciliation.providerOrderId === 'string' &&
    value.reconciliation.providerOrderId.length > 0 &&
    ADDRESS_PATTERN.test(string(value.walletAddress)) &&
    BLOCK_PATTERN.test(string(value.preBalanceBlockNumber)) &&
    isDecimal(value.preBnbBalance) &&
    isDecimal(value.preUsdtBalance) &&
    value.preBalanceObservedAt instanceof Date &&
    Number.isFinite(value.preBalanceObservedAt.getTime()) &&
    value.providerFeeRate === '0' &&
    value.providerFeeUsd === '0'
  );
}

function validSnapshotBalances(
  value: unknown,
): ReadonlyMap<string, FundingConversionAccountingBootstrapBalance> | null {
  if (
    !isRecord(value) ||
    value.scope !== 'agentic_wallet_funding_conversion_accounting_snapshot' ||
    value.chainId !== '56' ||
    !ADDRESS_PATTERN.test(string(value.walletAddress)) ||
    !BLOCK_PATTERN.test(string(value.blockNumber)) ||
    !(value.observedAt instanceof Date) ||
    !Number.isFinite(value.observedAt.getTime()) ||
    !Array.isArray(value.balances) ||
    value.balances.length !== 3
  )
    return null;
  const result = new Map<string, FundingConversionAccountingBootstrapBalance>();
  for (const raw of value.balances) {
    if (!isRecord(raw) || !isDecimal(raw.quantity)) return null;
    const identity =
      raw.assetType === 'native' &&
      raw.assetAddress === null &&
      raw.assetSymbol === 'BNB'
        ? 'native:BNB'
        : raw.assetType === 'token' &&
            typeof raw.assetAddress === 'string' &&
            raw.assetSymbol === null
          ? `token:${raw.assetAddress}`
          : '';
    if (
      raw.assetIdentity !== identity ||
      !requiredIdentities().includes(identity) ||
      result.has(identity)
    )
      return null;
    result.set(identity, {
      assetIdentity: identity,
      assetType: raw.assetType === 'native' ? 'native' : 'token',
      assetAddress:
        typeof raw.assetAddress === 'string' ? raw.assetAddress : null,
      assetSymbol: typeof raw.assetSymbol === 'string' ? raw.assetSymbol : null,
      currentQuantity: raw.quantity,
    });
  }
  return requiredIdentities().every((identity) => result.has(identity))
    ? result
    : null;
}

function isValidAbsence(
  value: unknown,
): value is FundingConversionAccountingAbsenceEvidence {
  if (!isRecord(value)) return false;
  return (
    value.scope === 'funding_conversion_accounting_absence_evidence' &&
    isCount(value.initializationCount) &&
    isCount(value.balanceCount) &&
    isCount(value.synchronizationCount) &&
    value.inspectedAt instanceof Date &&
    Number.isFinite(value.inspectedAt.getTime())
  );
}

function isValidRequest(
  value: unknown,
): value is FundingConversionAccountingBootstrapRequest {
  if (!isRecord(value)) return false;
  return (
    UUID_PATTERN.test(string(value.bootstrapId)) &&
    Number.isSafeInteger(value.maximumSnapshotAgeMs) &&
    (value.maximumSnapshotAgeMs as number) >= 1 &&
    (value.maximumSnapshotAgeMs as number) <= MAXIMUM_SNAPSHOT_AGE_MS &&
    value.preparedAt instanceof Date &&
    Number.isFinite(value.preparedAt.getTime())
  );
}

function requiredIdentities(): string[] {
  const instrument = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  return [
    'native:BNB',
    `token:${instrument.usdt.tokenAddress}`,
    `token:${instrument.btc.tokenAddress}`,
  ];
}

function requiredUsdtIdentity(): string {
  return `token:${APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT.usdt.tokenAddress}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function string(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function isDecimal(value: unknown): value is string {
  return typeof value === 'string' && DECIMAL_PATTERN.test(value);
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

function addIf(
  blockers: FundingConversionAccountingBootstrapBlocker[],
  condition: boolean,
  blocker: FundingConversionAccountingBootstrapBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
