import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from '../application/real-execution-instrument-approval';
import { isValidAgenticWalletAccountingBalanceInitialization } from './agentic-wallet-accounting-balance-initialization';
import { InitializedAgenticWalletAccountingBalances } from './agentic-wallet-accounting-balance-initialization.store';
import { AgenticWalletMarketSwapLocalAccountingBalance } from './agentic-wallet-market-swap-accounting-mutation-application';

const CANONICAL_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d*[1-9])?$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type AgenticWalletAccountingLedgerBalance =
  AgenticWalletMarketSwapLocalAccountingBalance & {
    readonly updatedAt: Date;
  };

export interface AgenticWalletAccountingLedgerSnapshot {
  readonly scope: 'agentic_wallet_accounting_ledger_snapshot';
  readonly initializationId: string;
  readonly providerId: 'agentic_wallet';
  readonly chainId: '56';
  readonly initialBalances: readonly AgenticWalletMarketSwapLocalAccountingBalance[];
  readonly currentBalances: readonly AgenticWalletAccountingLedgerBalance[];
  readonly initializedAt: Date;
  readonly evaluatedAt: Date;
  readonly ledgerCoverageComplete: true;
  readonly accountingBalancesInitialized: true;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export type AgenticWalletAccountingLedgerSnapshotBlocker =
  | 'invalid_accounting_initialization_receipt'
  | 'invalid_accounting_ledger_snapshot_request'
  | 'accounting_ledger_coverage_incomplete'
  | 'accounting_ledger_balance_identity_mismatch'
  | 'accounting_ledger_balance_chronology_invalid';

export interface AgenticWalletAccountingLedgerSnapshotAssessment {
  readonly scope: 'agentic_wallet_accounting_ledger_snapshot_assessment';
  readonly status: 'accounting_ledger_snapshot_ready' | 'blocked';
  readonly blockers: readonly AgenticWalletAccountingLedgerSnapshotBlocker[];
  readonly snapshot: AgenticWalletAccountingLedgerSnapshot | null;
  readonly accountingBalancesInitialized: boolean;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export function assessAgenticWalletAccountingLedgerSnapshot(
  initialized: InitializedAgenticWalletAccountingBalances,
  balances: readonly AgenticWalletAccountingLedgerBalance[],
  evaluatedAt: Date,
): AgenticWalletAccountingLedgerSnapshotAssessment {
  const blockers: AgenticWalletAccountingLedgerSnapshotBlocker[] = [];
  const initializationValid = isValidInitializedReceipt(initialized);
  addIf(
    blockers,
    !initializationValid,
    'invalid_accounting_initialization_receipt',
  );
  const requestValid =
    Array.isArray(balances) &&
    balances.length <= 10 &&
    evaluatedAt instanceof Date &&
    Number.isFinite(evaluatedAt.getTime());
  addIf(blockers, !requestValid, 'invalid_accounting_ledger_snapshot_request');

  const validatedBalances = requestValid ? validateBalances(balances) : null;
  addIf(
    blockers,
    validatedBalances?.coverageIncomplete === true,
    'accounting_ledger_coverage_incomplete',
  );
  addIf(
    blockers,
    validatedBalances?.identityMismatch === true,
    'accounting_ledger_balance_identity_mismatch',
  );
  if (initializationValid && requestValid && validatedBalances !== null) {
    addIf(
      blockers,
      evaluatedAt.getTime() < initialized.initializedAt.getTime() ||
        validatedBalances.balances.some(
          (balance) =>
            balance.updatedAt.getTime() < initialized.initializedAt.getTime() ||
            balance.updatedAt.getTime() > evaluatedAt.getTime(),
        ),
      'accounting_ledger_balance_chronology_invalid',
    );
  }

  const snapshot =
    blockers.length === 0 && initializationValid && validatedBalances !== null
      ? buildSnapshot(initialized, validatedBalances.balances, evaluatedAt)
      : null;
  return {
    scope: 'agentic_wallet_accounting_ledger_snapshot_assessment',
    status: snapshot === null ? 'blocked' : 'accounting_ledger_snapshot_ready',
    blockers,
    snapshot,
    accountingBalancesInitialized:
      initializationValid && initialized.accountingBalancesInitialized,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

export function isValidAgenticWalletAccountingLedgerSnapshot(
  value: unknown,
): value is AgenticWalletAccountingLedgerSnapshot {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const snapshot = value as Record<string, unknown>;
  if (
    snapshot.scope !== 'agentic_wallet_accounting_ledger_snapshot' ||
    typeof snapshot.initializationId !== 'string' ||
    !UUID_PATTERN.test(snapshot.initializationId) ||
    snapshot.providerId !== 'agentic_wallet' ||
    snapshot.chainId !== '56' ||
    snapshot.ledgerCoverageComplete !== true ||
    snapshot.accountingBalancesInitialized !== true ||
    snapshot.quoteAuthorized !== false ||
    snapshot.submissionAuthorized !== false ||
    !Array.isArray(snapshot.initialBalances) ||
    snapshot.initialBalances.length !== 3 ||
    !Array.isArray(snapshot.currentBalances) ||
    snapshot.currentBalances.length !== 3 ||
    !(snapshot.initializedAt instanceof Date) ||
    !Number.isFinite(snapshot.initializedAt.getTime()) ||
    !(snapshot.evaluatedAt instanceof Date) ||
    !Number.isFinite(snapshot.evaluatedAt.getTime()) ||
    snapshot.evaluatedAt.getTime() < snapshot.initializedAt.getTime()
  )
    return false;
  const initializedAt = snapshot.initializedAt;
  const evaluatedAt = snapshot.evaluatedAt;
  const validated = validateBalances(
    snapshot.currentBalances as AgenticWalletAccountingLedgerBalance[],
  );
  return (
    !validated.coverageIncomplete &&
    !validated.identityMismatch &&
    validated.balances.every(
      (balance) =>
        balance.updatedAt.getTime() >= initializedAt.getTime() &&
        balance.updatedAt.getTime() <= evaluatedAt.getTime(),
    ) &&
    hasExactInitialBalances(snapshot.initialBalances)
  );
}

function isValidInitializedReceipt(
  value: unknown,
): value is InitializedAgenticWalletAccountingBalances {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const receipt = value as Record<string, unknown>;
  return (
    receipt.scope === 'initialized_agentic_wallet_accounting_balances' &&
    isValidAgenticWalletAccountingBalanceInitialization(
      receipt.initialization,
    ) &&
    receipt.initializedAt instanceof Date &&
    Number.isFinite(receipt.initializedAt.getTime()) &&
    receipt.initializedAt.getTime() >=
      (receipt.initialization as { preparedAt: Date }).preparedAt.getTime() &&
    receipt.initializedAt.getTime() -
      (
        receipt.initialization as { walletObservedAt: Date }
      ).walletObservedAt.getTime() <=
      (receipt.initialization as { maximumObservationAgeMs: number })
        .maximumObservationAgeMs &&
    receipt.accountingBalancesInitialized === true &&
    receipt.quoteAuthorized === false &&
    receipt.submissionAuthorized === false
  );
}

function validateBalances(balances: readonly unknown[]): {
  balances: AgenticWalletAccountingLedgerBalance[];
  coverageIncomplete: boolean;
  identityMismatch: boolean;
} {
  const normalized: AgenticWalletAccountingLedgerBalance[] = [];
  const identities = new Set<string>();
  let identityMismatch = false;
  for (const raw of balances) {
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      identityMismatch = true;
      continue;
    }
    const balance = raw as Record<string, unknown>;
    const assetIdentity = identity(balance);
    const valid =
      assetIdentity !== null &&
      typeof balance.currentQuantity === 'string' &&
      CANONICAL_DECIMAL_PATTERN.test(balance.currentQuantity) &&
      balance.updatedAt instanceof Date &&
      Number.isFinite(balance.updatedAt.getTime()) &&
      !identities.has(assetIdentity);
    if (!valid) {
      identityMismatch = true;
      continue;
    }
    identities.add(assetIdentity);
    const currentQuantity = balance.currentQuantity as string;
    const updatedAt = balance.updatedAt as Date;
    normalized.push({
      ...(balance.assetType === 'token'
        ? {
            assetType: 'token' as const,
            assetAddress: balance.assetAddress as string,
          }
        : { assetType: 'native' as const, assetSymbol: 'BNB' as const }),
      currentQuantity,
      updatedAt: new Date(updatedAt),
    });
  }
  const required = requiredIdentities();
  return {
    balances: normalized.sort((left, right) =>
      (identity(left) ?? '').localeCompare(identity(right) ?? ''),
    ),
    coverageIncomplete:
      balances.length !== 3 ||
      normalized.length !== 3 ||
      required.some((value) => !identities.has(value)),
    identityMismatch,
  };
}

function hasExactInitialBalances(balances: readonly unknown[]): boolean {
  const identities = balances.map(identity);
  return (
    identities.every((value) => value !== null) &&
    new Set(identities).size === 3 &&
    requiredIdentities().every((value) => identities.includes(value)) &&
    balances.every((raw) => {
      const balance = raw as Record<string, unknown>;
      return (
        typeof balance.currentQuantity === 'string' &&
        CANONICAL_DECIMAL_PATTERN.test(balance.currentQuantity)
      );
    })
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

function identity(value: unknown): string | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return null;
  const record = value as Record<string, unknown>;
  const instrument = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  if (
    record.assetType === 'native' &&
    record.assetSymbol === 'BNB' &&
    !('assetAddress' in record)
  )
    return 'native:BNB';
  if (
    record.assetType === 'token' &&
    typeof record.assetAddress === 'string' &&
    (record.assetAddress === instrument.usdt.tokenAddress ||
      record.assetAddress === instrument.btc.tokenAddress) &&
    !('assetSymbol' in record)
  )
    return `token:${record.assetAddress}`;
  return null;
}

function buildSnapshot(
  initialized: InitializedAgenticWalletAccountingBalances,
  balances: readonly AgenticWalletAccountingLedgerBalance[],
  evaluatedAt: Date,
): AgenticWalletAccountingLedgerSnapshot {
  return {
    scope: 'agentic_wallet_accounting_ledger_snapshot',
    initializationId: initialized.initialization.initializationId,
    providerId: 'agentic_wallet',
    chainId: '56',
    initialBalances: initialized.initialization.balances.map((balance) => ({
      ...balance,
    })),
    currentBalances: balances.map((balance) => ({
      ...balance,
      updatedAt: new Date(balance.updatedAt),
    })),
    initializedAt: new Date(initialized.initializedAt),
    evaluatedAt: new Date(evaluatedAt),
    ledgerCoverageComplete: true,
    accountingBalancesInitialized: true,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function addIf(
  blockers: AgenticWalletAccountingLedgerSnapshotBlocker[],
  condition: boolean,
  blocker: AgenticWalletAccountingLedgerSnapshotBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
