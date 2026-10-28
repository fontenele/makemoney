import { isDeepStrictEqual } from 'node:util';

import Decimal from 'decimal.js';

import {
  RealExecutionIntent,
  RealExecutionQuote,
  validateRealExecutionIntent,
  validateRealExecutionQuote,
} from '../domain/real-execution';
import {
  AgenticWalletAccountingReconciledBalanceSnapshot,
  isValidAgenticWalletAccountingReconciledBalanceSnapshot,
} from '../infrastructure/agentic-wallet-accounting-reconciled-balance-snapshot';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import { RealExecutionResourceSnapshot } from './real-execution-resource-risk';

const ExactDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;

export type AgenticWalletAccountingReconciledResourceSnapshotBlocker =
  | 'invalid_reconciled_balance_snapshot'
  | 'invalid_real_execution_intent'
  | 'invalid_real_execution_quote'
  | 'quote_intent_mismatch'
  | 'quote_provider_mismatch'
  | 'instrument_not_approved'
  | 'source_balance_absent'
  | 'native_gas_balance_absent'
  | 'invalid_native_gas_requirement';

export interface AgenticWalletAccountingReconciledResourceSnapshotAssessment {
  readonly scope: 'agentic_wallet_accounting_reconciled_resource_snapshot_assessment';
  readonly status: 'resource_snapshot_ready' | 'blocked';
  readonly blockers: readonly AgenticWalletAccountingReconciledResourceSnapshotBlocker[];
  readonly resourceSnapshot: RealExecutionResourceSnapshot | null;
  readonly reconciliationId: string | null;
  readonly reconciliationFingerprint: string | null;
  readonly balanceCoverageComplete: boolean;
  readonly durableResourceReservation: false;
  readonly riskApproved: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export function prepareAgenticWalletAccountingReconciledResourceSnapshot(
  balances: AgenticWalletAccountingReconciledBalanceSnapshot,
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
  nativeGasRequiredQuantity: string,
): AgenticWalletAccountingReconciledResourceSnapshotAssessment {
  const blockers: AgenticWalletAccountingReconciledResourceSnapshotBlocker[] =
    [];
  const balancesValid =
    isValidAgenticWalletAccountingReconciledBalanceSnapshot(balances);
  addIf(blockers, !balancesValid, 'invalid_reconciled_balance_snapshot');
  const intentValid = validIntent(intent);
  addIf(blockers, !intentValid, 'invalid_real_execution_intent');
  const quoteValid = validQuote(quote);
  addIf(blockers, !quoteValid, 'invalid_real_execution_quote');
  addIf(
    blockers,
    intentValid && quoteValid && !isDeepStrictEqual(quote.intent, intent),
    'quote_intent_mismatch',
  );
  addIf(
    blockers,
    quoteValid && quote.providerId !== 'agentic_wallet',
    'quote_provider_mismatch',
  );
  addIf(
    blockers,
    intentValid && !approvedIntent(intent),
    'instrument_not_approved',
  );
  const gasRequirementValid =
    typeof nativeGasRequiredQuantity === 'string' &&
    POSITIVE_DECIMAL_PATTERN.test(nativeGasRequiredQuantity);
  addIf(blockers, !gasRequirementValid, 'invalid_native_gas_requirement');

  const sourceBalance =
    balancesValid && intentValid
      ? balances.balances.find(
          (balance) =>
            balance.assetType === 'token' &&
            balance.assetAddress.toLowerCase() ===
              intent.sourceAsset.tokenAddress.toLowerCase(),
        )
      : undefined;
  const nativeGasBalance = balancesValid
    ? balances.balances.find(
        (balance) =>
          balance.assetType === 'native' && balance.assetSymbol === 'BNB',
      )
    : undefined;
  addIf(
    blockers,
    balancesValid && intentValid && sourceBalance === undefined,
    'source_balance_absent',
  );
  addIf(
    blockers,
    balancesValid && nativeGasBalance === undefined,
    'native_gas_balance_absent',
  );

  if (
    blockers.length > 0 ||
    !balancesValid ||
    !intentValid ||
    !quoteValid ||
    !gasRequirementValid ||
    sourceBalance === undefined ||
    sourceBalance.assetType !== 'token' ||
    nativeGasBalance === undefined ||
    nativeGasBalance.assetType !== 'native'
  )
    return assessment(blockers, null, balancesValid ? balances : null);

  return assessment(
    blockers,
    {
      providerId: balances.providerId,
      chainId: balances.chainId,
      intentId: intent.id,
      quoteId: quote.id,
      sourceTokenAddress: intent.sourceAsset.tokenAddress.toLowerCase(),
      sourceSymbol: intent.sourceAsset.symbol as 'BTCB' | 'USDT',
      sourceAvailableQuantity: sourceBalance.currentQuantity,
      sourceBalanceCoverage: 'complete',
      nativeGasSymbol: 'BNB',
      nativeGasAvailableQuantity: nativeGasBalance.currentQuantity,
      nativeGasRequiredQuantity: new ExactDecimal(
        nativeGasRequiredQuantity,
      ).toFixed(),
      nativeGasCoverage: 'complete',
      observedAt: new Date(balances.observedAt),
    },
    balances,
  );
}

function validIntent(intent: RealExecutionIntent): boolean {
  try {
    validateRealExecutionIntent(intent);
    return true;
  } catch {
    return false;
  }
}

function validQuote(quote: RealExecutionQuote): boolean {
  try {
    validateRealExecutionQuote(quote);
    return true;
  } catch {
    return false;
  }
}

function approvedIntent(intent: RealExecutionIntent): boolean {
  const approved = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  const source = intent.sourceAsset.tokenAddress.toLowerCase();
  const target = intent.targetAsset.tokenAddress.toLowerCase();
  const usdt = approved.usdt.tokenAddress.toLowerCase();
  const btcb = approved.btc.tokenAddress.toLowerCase();
  return (
    intent.chainId === approved.chainId &&
    ((source === usdt &&
      intent.sourceAsset.symbol === 'USDT' &&
      target === btcb &&
      intent.targetAsset.symbol === 'BTCB') ||
      (source === btcb &&
        intent.sourceAsset.symbol === 'BTCB' &&
        target === usdt &&
        intent.targetAsset.symbol === 'USDT'))
  );
}

function assessment(
  blockers: readonly AgenticWalletAccountingReconciledResourceSnapshotBlocker[],
  resourceSnapshot: RealExecutionResourceSnapshot | null,
  balances: AgenticWalletAccountingReconciledBalanceSnapshot | null,
): AgenticWalletAccountingReconciledResourceSnapshotAssessment {
  return {
    scope: 'agentic_wallet_accounting_reconciled_resource_snapshot_assessment',
    status: resourceSnapshot === null ? 'blocked' : 'resource_snapshot_ready',
    blockers: [...blockers],
    resourceSnapshot:
      resourceSnapshot === null
        ? null
        : {
            ...resourceSnapshot,
            observedAt: new Date(resourceSnapshot.observedAt),
          },
    reconciliationId: balances?.reconciliationId ?? null,
    reconciliationFingerprint: balances?.reconciliationFingerprint ?? null,
    balanceCoverageComplete: resourceSnapshot !== null,
    durableResourceReservation: false,
    riskApproved: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function addIf(
  blockers: AgenticWalletAccountingReconciledResourceSnapshotBlocker[],
  condition: boolean,
  blocker: AgenticWalletAccountingReconciledResourceSnapshotBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
