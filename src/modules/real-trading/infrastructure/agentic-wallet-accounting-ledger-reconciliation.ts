import {
  ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
  prepareAgenticWalletAccountingBalanceInitialization,
} from './agentic-wallet-accounting-balance-initialization';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from '../application/real-execution-instrument-approval';
import { AgenticWalletCapabilityObservation } from './agentic-wallet-capability.adapter';
import {
  AgenticWalletAccountingLedgerSnapshot,
  isValidAgenticWalletAccountingLedgerSnapshot,
} from './agentic-wallet-accounting-ledger-snapshot';
import { AgenticWalletMarketSwapLocalAccountingBalance } from './agentic-wallet-market-swap-accounting-mutation-application';

const MAXIMUM_OBSERVATION_AGE_MS = 60_000;

export interface AgenticWalletAccountingLedgerReconciliationRequest {
  readonly maximumObservationAgeMs: number;
  readonly evaluatedAt: Date;
}

export interface AgenticWalletAccountingLedgerReconciliation {
  readonly scope: 'agentic_wallet_accounting_ledger_reconciliation';
  readonly initializationId: string;
  readonly providerId: 'agentic_wallet';
  readonly chainId: '56';
  readonly ledgerSnapshot: AgenticWalletAccountingLedgerSnapshot;
  readonly walletBalances: readonly AgenticWalletMarketSwapLocalAccountingBalance[];
  readonly walletObservedAt: Date;
  readonly reconciledAt: Date;
  readonly walletObservationAuthenticated: true;
  readonly ledgerBalancesReconciled: true;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export type AgenticWalletAccountingLedgerReconciliationBlocker =
  | 'invalid_accounting_ledger_snapshot'
  | 'invalid_accounting_ledger_reconciliation_request'
  | 'wallet_observation_invalid_or_unavailable'
  | 'accounting_ledger_reconciliation_chronology_invalid'
  | 'wallet_observation_predates_ledger'
  | 'wallet_accounting_balance_mismatch';

export interface AgenticWalletAccountingLedgerReconciliationAssessment {
  readonly scope: 'agentic_wallet_accounting_ledger_reconciliation_assessment';
  readonly status: 'accounting_ledger_reconciled' | 'blocked';
  readonly blockers: readonly AgenticWalletAccountingLedgerReconciliationBlocker[];
  readonly reconciliation: AgenticWalletAccountingLedgerReconciliation | null;
  readonly ledgerBalancesReconciled: boolean;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export function reconcileAgenticWalletAccountingLedger(
  snapshot: AgenticWalletAccountingLedgerSnapshot,
  observation: AgenticWalletCapabilityObservation,
  request: AgenticWalletAccountingLedgerReconciliationRequest,
): AgenticWalletAccountingLedgerReconciliationAssessment {
  const blockers: AgenticWalletAccountingLedgerReconciliationBlocker[] = [];
  const snapshotValid = isValidAgenticWalletAccountingLedgerSnapshot(snapshot);
  const requestValid =
    isValidAgenticWalletAccountingLedgerReconciliationRequest(request);
  addIf(blockers, !snapshotValid, 'invalid_accounting_ledger_snapshot');
  addIf(
    blockers,
    !requestValid,
    'invalid_accounting_ledger_reconciliation_request',
  );

  let walletBalances:
    readonly AgenticWalletMarketSwapLocalAccountingBalance[] | null = null;
  let walletObservedAt: Date | null = null;
  if (snapshotValid && requestValid) {
    addIf(
      blockers,
      request.evaluatedAt.getTime() < snapshot.evaluatedAt.getTime(),
      'accounting_ledger_reconciliation_chronology_invalid',
    );
    const walletAssessment =
      prepareAgenticWalletAccountingBalanceInitialization(observation, {
        initializationId: snapshot.initializationId,
        acknowledgment: ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
        maximumObservationAgeMs: request.maximumObservationAgeMs,
        preparedAt: request.evaluatedAt,
      });
    if (walletAssessment.initialization === null) {
      addIf(blockers, true, 'wallet_observation_invalid_or_unavailable');
    } else {
      walletBalances = walletAssessment.initialization.balances;
      walletObservedAt = walletAssessment.initialization.walletObservedAt;
      addIf(
        blockers,
        snapshot.currentBalances.some(
          (balance) =>
            balance.updatedAt.getTime() > walletObservedAt!.getTime(),
        ),
        'wallet_observation_predates_ledger',
      );
      addIf(
        blockers,
        !balancesEqual(snapshot.currentBalances, walletBalances),
        'wallet_accounting_balance_mismatch',
      );
    }
  }

  const reconciliation =
    blockers.length === 0 &&
    snapshotValid &&
    requestValid &&
    walletBalances !== null &&
    walletObservedAt !== null
      ? buildReconciliation(
          snapshot,
          walletBalances,
          walletObservedAt,
          request.evaluatedAt,
        )
      : null;
  return {
    scope: 'agentic_wallet_accounting_ledger_reconciliation_assessment',
    status:
      reconciliation === null ? 'blocked' : 'accounting_ledger_reconciled',
    blockers,
    reconciliation,
    ledgerBalancesReconciled: reconciliation !== null,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

export function isValidAgenticWalletAccountingLedgerReconciliation(
  value: unknown,
): value is AgenticWalletAccountingLedgerReconciliation {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const reconciliation = value as Record<string, unknown>;
  if (
    reconciliation.scope !==
      'agentic_wallet_accounting_ledger_reconciliation' ||
    reconciliation.providerId !== 'agentic_wallet' ||
    reconciliation.chainId !== '56' ||
    reconciliation.walletObservationAuthenticated !== true ||
    reconciliation.ledgerBalancesReconciled !== true ||
    reconciliation.quoteAuthorized !== false ||
    reconciliation.submissionAuthorized !== false ||
    !isValidAgenticWalletAccountingLedgerSnapshot(
      reconciliation.ledgerSnapshot,
    ) ||
    reconciliation.initializationId !==
      reconciliation.ledgerSnapshot.initializationId ||
    !Array.isArray(reconciliation.walletBalances) ||
    !hasExactWalletBalances(reconciliation.walletBalances) ||
    !(reconciliation.walletObservedAt instanceof Date) ||
    !Number.isFinite(reconciliation.walletObservedAt.getTime()) ||
    !(reconciliation.reconciledAt instanceof Date) ||
    !Number.isFinite(reconciliation.reconciledAt.getTime()) ||
    reconciliation.walletObservedAt.getTime() >
      reconciliation.reconciledAt.getTime() ||
    reconciliation.reconciledAt.getTime() <
      reconciliation.ledgerSnapshot.evaluatedAt.getTime()
  )
    return false;
  const snapshot = reconciliation.ledgerSnapshot;
  return (
    snapshot.currentBalances.every(
      (balance) =>
        balance.updatedAt.getTime() <=
        (reconciliation.walletObservedAt as Date).getTime(),
    ) &&
    balancesEqual(
      snapshot.currentBalances,
      reconciliation.walletBalances as AgenticWalletMarketSwapLocalAccountingBalance[],
    )
  );
}

function hasExactWalletBalances(value: readonly unknown[]): boolean {
  if (value.length !== 3) return false;
  const instrument = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  const expected = new Set([
    'native:BNB',
    `token:${instrument.usdt.tokenAddress}`,
    `token:${instrument.btc.tokenAddress}`,
  ]);
  const identities = new Set<string>();
  for (const raw of value) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw))
      return false;
    const balance = raw as Record<string, unknown>;
    const balanceIdentity =
      balance.assetType === 'token' &&
      typeof balance.assetAddress === 'string' &&
      !('assetSymbol' in balance)
        ? `token:${balance.assetAddress}`
        : balance.assetType === 'native' &&
            balance.assetSymbol === 'BNB' &&
            !('assetAddress' in balance)
          ? 'native:BNB'
          : null;
    if (
      balanceIdentity === null ||
      !expected.has(balanceIdentity) ||
      identities.has(balanceIdentity) ||
      typeof balance.currentQuantity !== 'string' ||
      !/^(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/.test(balance.currentQuantity)
    )
      return false;
    identities.add(balanceIdentity);
  }
  return identities.size === expected.size;
}

export function isValidAgenticWalletAccountingLedgerReconciliationRequest(
  value: unknown,
): value is AgenticWalletAccountingLedgerReconciliationRequest {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const request = value as Record<string, unknown>;
  return (
    Number.isSafeInteger(request.maximumObservationAgeMs) &&
    (request.maximumObservationAgeMs as number) >= 1 &&
    (request.maximumObservationAgeMs as number) <= MAXIMUM_OBSERVATION_AGE_MS &&
    request.evaluatedAt instanceof Date &&
    Number.isFinite(request.evaluatedAt.getTime())
  );
}

function balancesEqual(
  ledger: readonly AgenticWalletMarketSwapLocalAccountingBalance[],
  wallet: readonly AgenticWalletMarketSwapLocalAccountingBalance[],
): boolean {
  if (ledger.length !== 3 || wallet.length !== 3) return false;
  const walletByIdentity = new Map(
    wallet.map((balance) => [identity(balance), balance.currentQuantity]),
  );
  return ledger.every(
    (balance) =>
      walletByIdentity.get(identity(balance)) === balance.currentQuantity,
  );
}

function buildReconciliation(
  snapshot: AgenticWalletAccountingLedgerSnapshot,
  walletBalances: readonly AgenticWalletMarketSwapLocalAccountingBalance[],
  walletObservedAt: Date,
  reconciledAt: Date,
): AgenticWalletAccountingLedgerReconciliation {
  return {
    scope: 'agentic_wallet_accounting_ledger_reconciliation',
    initializationId: snapshot.initializationId,
    providerId: 'agentic_wallet',
    chainId: '56',
    ledgerSnapshot: {
      ...snapshot,
      initialBalances: snapshot.initialBalances.map((balance) => ({
        ...balance,
      })),
      currentBalances: snapshot.currentBalances.map((balance) => ({
        ...balance,
        updatedAt: new Date(balance.updatedAt),
      })),
      initializedAt: new Date(snapshot.initializedAt),
      evaluatedAt: new Date(snapshot.evaluatedAt),
    },
    walletBalances: walletBalances.map((balance) => ({ ...balance })),
    walletObservedAt: new Date(walletObservedAt),
    reconciledAt: new Date(reconciledAt),
    walletObservationAuthenticated: true,
    ledgerBalancesReconciled: true,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function identity(
  value: AgenticWalletMarketSwapLocalAccountingBalance,
): string {
  return value.assetType === 'token'
    ? `token:${value.assetAddress}`
    : `native:${value.assetSymbol}`;
}

function addIf(
  blockers: AgenticWalletAccountingLedgerReconciliationBlocker[],
  condition: boolean,
  blocker: AgenticWalletAccountingLedgerReconciliationBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
