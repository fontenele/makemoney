import { createHash } from 'node:crypto';

import {
  AgenticWalletAccountingLedgerReconciliation,
  isValidAgenticWalletAccountingLedgerReconciliation,
} from './agentic-wallet-accounting-ledger-reconciliation';
import { AgenticWalletAccountingLedgerBalance } from './agentic-wallet-accounting-ledger-snapshot';
import { AgenticWalletMarketSwapLocalAccountingBalance } from './agentic-wallet-market-swap-accounting-mutation-application';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;

export type AgenticWalletAccountingLedgerReconciliationCommitmentBlocker =
  | 'invalid_accounting_ledger_reconciliation'
  | 'invalid_accounting_ledger_reconciliation_identity'
  | 'invalid_accounting_ledger_reconciliation_prepared_at'
  | 'accounting_ledger_reconciliation_preparation_predates_reconciliation';

export interface AgenticWalletAccountingLedgerReconciliationCommitment {
  readonly scope: 'agentic_wallet_accounting_ledger_reconciliation_commitment';
  readonly reconciliationId: string;
  readonly reconciliationFingerprint: string;
  readonly reconciliation: AgenticWalletAccountingLedgerReconciliation;
  readonly preparedAt: Date;
  readonly reconciliationEvidencePrepared: true;
  readonly walletObservationAuthenticated: true;
  readonly ledgerBalancesReconciled: true;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export interface AgenticWalletAccountingLedgerReconciliationCommitmentAssessment {
  readonly scope: 'agentic_wallet_accounting_ledger_reconciliation_commitment_assessment';
  readonly status: 'reconciliation_commitment_ready' | 'blocked';
  readonly blockers: readonly AgenticWalletAccountingLedgerReconciliationCommitmentBlocker[];
  readonly commitment: AgenticWalletAccountingLedgerReconciliationCommitment | null;
  readonly reconciliationEvidencePrepared: boolean;
  readonly walletObservationAuthenticated: boolean;
  readonly ledgerBalancesReconciled: boolean;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export function prepareAgenticWalletAccountingLedgerReconciliationCommitment(
  reconciliation: AgenticWalletAccountingLedgerReconciliation,
  reconciliationId: string,
  preparedAt: Date,
): AgenticWalletAccountingLedgerReconciliationCommitmentAssessment {
  const blockers: AgenticWalletAccountingLedgerReconciliationCommitmentBlocker[] =
    [];
  const reconciliationValid =
    isValidAgenticWalletAccountingLedgerReconciliation(reconciliation);
  addIf(
    blockers,
    !reconciliationValid,
    'invalid_accounting_ledger_reconciliation',
  );
  addIf(
    blockers,
    typeof reconciliationId !== 'string' ||
      !UUID_PATTERN.test(reconciliationId),
    'invalid_accounting_ledger_reconciliation_identity',
  );
  const preparedAtValid =
    preparedAt instanceof Date && Number.isFinite(preparedAt.getTime());
  addIf(
    blockers,
    !preparedAtValid,
    'invalid_accounting_ledger_reconciliation_prepared_at',
  );
  addIf(
    blockers,
    reconciliationValid &&
      preparedAtValid &&
      preparedAt.getTime() < reconciliation.reconciledAt.getTime(),
    'accounting_ledger_reconciliation_preparation_predates_reconciliation',
  );

  if (blockers.length > 0) return result(blockers, null, reconciliationValid);

  const committedReconciliation = snapshotReconciliation(reconciliation);
  return result(
    [],
    {
      scope: 'agentic_wallet_accounting_ledger_reconciliation_commitment',
      reconciliationId,
      reconciliationFingerprint: fingerprint(committedReconciliation),
      reconciliation: committedReconciliation,
      preparedAt: new Date(preparedAt),
      reconciliationEvidencePrepared: true,
      walletObservationAuthenticated: true,
      ledgerBalancesReconciled: true,
      quoteAuthorized: false,
      submissionAuthorized: false,
    },
    true,
  );
}

export function isValidAgenticWalletAccountingLedgerReconciliationCommitment(
  value: unknown,
): value is AgenticWalletAccountingLedgerReconciliationCommitment {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const commitment = value as Record<string, unknown>;
  const assessment =
    prepareAgenticWalletAccountingLedgerReconciliationCommitment(
      commitment.reconciliation as AgenticWalletAccountingLedgerReconciliation,
      commitment.reconciliationId as string,
      commitment.preparedAt as Date,
    );
  return (
    commitment.scope ===
      'agentic_wallet_accounting_ledger_reconciliation_commitment' &&
    typeof commitment.reconciliationFingerprint === 'string' &&
    SHA256_PATTERN.test(commitment.reconciliationFingerprint) &&
    commitment.reconciliationEvidencePrepared === true &&
    commitment.walletObservationAuthenticated === true &&
    commitment.ledgerBalancesReconciled === true &&
    commitment.quoteAuthorized === false &&
    commitment.submissionAuthorized === false &&
    assessment.commitment !== null &&
    assessment.commitment.reconciliationFingerprint ===
      commitment.reconciliationFingerprint
  );
}

function snapshotReconciliation(
  reconciliation: AgenticWalletAccountingLedgerReconciliation,
): AgenticWalletAccountingLedgerReconciliation {
  return {
    scope: 'agentic_wallet_accounting_ledger_reconciliation',
    initializationId: reconciliation.initializationId,
    providerId: 'agentic_wallet',
    chainId: '56',
    ledgerSnapshot: {
      scope: 'agentic_wallet_accounting_ledger_snapshot',
      initializationId: reconciliation.ledgerSnapshot.initializationId,
      providerId: 'agentic_wallet',
      chainId: '56',
      initialBalances: reconciliation.ledgerSnapshot.initialBalances
        .map(canonicalBalance)
        .sort(compareBalances),
      currentBalances: reconciliation.ledgerSnapshot.currentBalances
        .map(canonicalLedgerBalance)
        .sort(compareBalances),
      initializedAt: new Date(reconciliation.ledgerSnapshot.initializedAt),
      evaluatedAt: new Date(reconciliation.ledgerSnapshot.evaluatedAt),
      ledgerCoverageComplete: true,
      accountingBalancesInitialized: true,
      quoteAuthorized: false,
      submissionAuthorized: false,
    },
    walletBalances: reconciliation.walletBalances
      .map(canonicalBalance)
      .sort(compareBalances),
    walletObservedAt: new Date(reconciliation.walletObservedAt),
    reconciledAt: new Date(reconciliation.reconciledAt),
    walletObservationAuthenticated: true,
    ledgerBalancesReconciled: true,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function canonicalLedgerBalance(
  balance: AgenticWalletAccountingLedgerBalance,
): AgenticWalletAccountingLedgerBalance {
  return {
    ...canonicalBalance(balance),
    updatedAt: new Date(balance.updatedAt),
  };
}

function canonicalBalance(
  balance: AgenticWalletMarketSwapLocalAccountingBalance,
): AgenticWalletMarketSwapLocalAccountingBalance {
  return balance.assetType === 'token'
    ? {
        assetType: 'token',
        assetAddress: balance.assetAddress,
        currentQuantity: balance.currentQuantity,
      }
    : {
        assetType: 'native',
        assetSymbol: balance.assetSymbol,
        currentQuantity: balance.currentQuantity,
      };
}

function fingerprint(
  reconciliation: AgenticWalletAccountingLedgerReconciliation,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        ...reconciliation,
        ledgerSnapshot: {
          ...reconciliation.ledgerSnapshot,
          currentBalances: reconciliation.ledgerSnapshot.currentBalances.map(
            (balance) => ({
              ...balance,
              updatedAt: balance.updatedAt.toISOString(),
            }),
          ),
          initializedAt:
            reconciliation.ledgerSnapshot.initializedAt.toISOString(),
          evaluatedAt: reconciliation.ledgerSnapshot.evaluatedAt.toISOString(),
        },
        walletObservedAt: reconciliation.walletObservedAt.toISOString(),
        reconciledAt: reconciliation.reconciledAt.toISOString(),
      }),
    )
    .digest('hex');
}

function compareBalances(
  left: AgenticWalletMarketSwapLocalAccountingBalance,
  right: AgenticWalletMarketSwapLocalAccountingBalance,
): number {
  return balanceIdentity(left).localeCompare(balanceIdentity(right));
}

function balanceIdentity(
  balance: AgenticWalletMarketSwapLocalAccountingBalance,
): string {
  return balance.assetType === 'token'
    ? `token:${balance.assetAddress}`
    : `native:${balance.assetSymbol}`;
}

function result(
  blockers: readonly AgenticWalletAccountingLedgerReconciliationCommitmentBlocker[],
  commitment: AgenticWalletAccountingLedgerReconciliationCommitment | null,
  reconciliationValid: boolean,
): AgenticWalletAccountingLedgerReconciliationCommitmentAssessment {
  return {
    scope:
      'agentic_wallet_accounting_ledger_reconciliation_commitment_assessment',
    status: commitment === null ? 'blocked' : 'reconciliation_commitment_ready',
    blockers,
    commitment,
    reconciliationEvidencePrepared: commitment !== null,
    walletObservationAuthenticated: reconciliationValid,
    ledgerBalancesReconciled: reconciliationValid,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function addIf(
  blockers: AgenticWalletAccountingLedgerReconciliationCommitmentBlocker[],
  condition: boolean,
  blocker: AgenticWalletAccountingLedgerReconciliationCommitmentBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
