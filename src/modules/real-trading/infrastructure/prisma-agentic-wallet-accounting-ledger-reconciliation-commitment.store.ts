import { createHash } from 'node:crypto';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletAccountingLedgerReconciliation,
  isValidAgenticWalletAccountingLedgerReconciliation,
} from './agentic-wallet-accounting-ledger-reconciliation';
import {
  AgenticWalletAccountingLedgerReconciliationCommitment,
  isValidAgenticWalletAccountingLedgerReconciliationCommitment,
  prepareAgenticWalletAccountingLedgerReconciliationCommitment,
} from './agentic-wallet-accounting-ledger-reconciliation-commitment';
import {
  AgenticWalletAccountingLedgerReconciliationCommitmentBlockedError,
  AgenticWalletAccountingLedgerReconciliationCommitmentConflictError,
  AgenticWalletAccountingLedgerReconciliationCommitmentStore,
  AgenticWalletAccountingLedgerReconciliationInitializationNotFoundError,
  StoredAgenticWalletAccountingLedgerReconciliationCommitment,
  isValidStoredAgenticWalletAccountingLedgerReconciliationCommitment,
} from './agentic-wallet-accounting-ledger-reconciliation-commitment.store';
import {
  AgenticWalletAccountingLedgerBalance,
  assessAgenticWalletAccountingLedgerSnapshot,
} from './agentic-wallet-accounting-ledger-snapshot';
import { AgenticWalletMarketSwapLocalAccountingBalance } from './agentic-wallet-market-swap-accounting-mutation-application';
import { mapPersistedAgenticWalletAccountingBalanceInitialization } from './prisma-agentic-wallet-accounting-balance-initialization.store';
import { mapPersistedAgenticWalletAccountingLedgerBalance } from './prisma-agentic-wallet-accounting-ledger-snapshot.store';

type ReconciliationRow = {
  id: string;
  initializationId: string;
  providerId: string;
  chainId: string;
  reconciliationFingerprint: string;
  initialBalances: unknown;
  currentBalances: unknown;
  initializedAt: Date;
  evaluatedAt: Date;
  walletBalances: unknown;
  walletObservedAt: Date;
  reconciledAt: Date;
  preparedAt: Date;
  requestFingerprint: string;
  recordedAt: Date;
};

export class PrismaAgenticWalletAccountingLedgerReconciliationCommitmentStore implements AgenticWalletAccountingLedgerReconciliationCommitmentStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async record(
    commitment: AgenticWalletAccountingLedgerReconciliationCommitment,
  ): Promise<{
    stored: StoredAgenticWalletAccountingLedgerReconciliationCommitment;
    replayed: boolean;
  }> {
    if (
      !isValidAgenticWalletAccountingLedgerReconciliationCommitment(commitment)
    )
      throw new AgenticWalletAccountingLedgerReconciliationCommitmentBlockedError(
        ['invalid_accounting_ledger_reconciliation'],
      );
    const requestFingerprint = fingerprint(commitment);

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261017, 108)`;
        const existing =
          await tx.realExecutionAccountingLedgerReconciliation.findFirst({
            where: {
              OR: [
                { id: commitment.reconciliationId },
                {
                  reconciliationFingerprint:
                    commitment.reconciliationFingerprint,
                },
              ],
            },
          });
        if (existing) {
          if (existing.requestFingerprint !== requestFingerprint)
            throw new AgenticWalletAccountingLedgerReconciliationCommitmentConflictError();
          return {
            stored:
              mapPersistedAgenticWalletAccountingLedgerReconciliationCommitment(
                existing,
              ),
            replayed: true,
          };
        }

        const initialization =
          await tx.realExecutionAccountingBalanceInitialization.findUnique({
            where: { id: commitment.reconciliation.initializationId },
          });
        if (!initialization)
          throw new AgenticWalletAccountingLedgerReconciliationInitializationNotFoundError();
        const initialized =
          mapPersistedAgenticWalletAccountingBalanceInitialization(
            initialization,
          );
        const balanceRows = await tx.realExecutionAccountingBalance.findMany({
          orderBy: { assetIdentity: 'asc' },
        });
        const balances = balanceRows.map(
          mapPersistedAgenticWalletAccountingLedgerBalance,
        );
        const durableSnapshot = assessAgenticWalletAccountingLedgerSnapshot(
          initialized,
          balances,
          commitment.reconciliation.ledgerSnapshot.evaluatedAt,
        ).snapshot;
        if (
          durableSnapshot === null ||
          fingerprint(durableSnapshot) !==
            fingerprint(commitment.reconciliation.ledgerSnapshot)
        )
          throw new AgenticWalletAccountingLedgerReconciliationCommitmentBlockedError(
            ['invalid_accounting_ledger_reconciliation'],
          );

        const durableAssessment =
          prepareAgenticWalletAccountingLedgerReconciliationCommitment(
            {
              ...commitment.reconciliation,
              ledgerSnapshot: durableSnapshot,
            },
            commitment.reconciliationId,
            commitment.preparedAt,
          );
        if (
          durableAssessment.commitment === null ||
          durableAssessment.commitment.reconciliationFingerprint !==
            commitment.reconciliationFingerprint
        )
          throw new AgenticWalletAccountingLedgerReconciliationCommitmentBlockedError(
            durableAssessment.blockers.length > 0
              ? durableAssessment.blockers
              : ['invalid_accounting_ledger_reconciliation'],
          );

        const recordedAt = this.now();
        if (
          !(recordedAt instanceof Date) ||
          !Number.isFinite(recordedAt.getTime()) ||
          recordedAt.getTime() < commitment.preparedAt.getTime()
        )
          throw new Error(
            'Accounting ledger reconciliation recording metadata is invalid',
          );

        const value = durableAssessment.commitment;
        const snapshot = value.reconciliation.ledgerSnapshot;
        const created =
          await tx.realExecutionAccountingLedgerReconciliation.create({
            data: {
              id: value.reconciliationId,
              initializationId: value.reconciliation.initializationId,
              providerId: value.reconciliation.providerId,
              chainId: value.reconciliation.chainId,
              reconciliationFingerprint: value.reconciliationFingerprint,
              initialBalances: snapshot.initialBalances,
              currentBalances: snapshot.currentBalances.map((balance) => ({
                ...balance,
                updatedAt: balance.updatedAt.toISOString(),
              })),
              initializedAt: snapshot.initializedAt,
              evaluatedAt: snapshot.evaluatedAt,
              walletBalances: value.reconciliation.walletBalances,
              walletObservedAt: value.reconciliation.walletObservedAt,
              reconciledAt: value.reconciliation.reconciledAt,
              preparedAt: value.preparedAt,
              requestFingerprint,
              recordedAt,
            },
          });
        return {
          stored:
            mapPersistedAgenticWalletAccountingLedgerReconciliationCommitment(
              created,
            ),
          replayed: false,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

export function mapPersistedAgenticWalletAccountingLedgerReconciliationCommitment(
  row: ReconciliationRow,
): StoredAgenticWalletAccountingLedgerReconciliationCommitment {
  const reconciliation: AgenticWalletAccountingLedgerReconciliation = {
    scope: 'agentic_wallet_accounting_ledger_reconciliation',
    initializationId: row.initializationId,
    providerId: row.providerId as 'agentic_wallet',
    chainId: row.chainId as '56',
    ledgerSnapshot: {
      scope: 'agentic_wallet_accounting_ledger_snapshot',
      initializationId: row.initializationId,
      providerId: row.providerId as 'agentic_wallet',
      chainId: row.chainId as '56',
      initialBalances: deserializeBalances(row.initialBalances),
      currentBalances: deserializeCurrentBalances(row.currentBalances),
      initializedAt: new Date(row.initializedAt),
      evaluatedAt: new Date(row.evaluatedAt),
      ledgerCoverageComplete: true,
      accountingBalancesInitialized: true,
      quoteAuthorized: false,
      submissionAuthorized: false,
    },
    walletBalances: deserializeBalances(row.walletBalances),
    walletObservedAt: new Date(row.walletObservedAt),
    reconciledAt: new Date(row.reconciledAt),
    walletObservationAuthenticated: true,
    ledgerBalancesReconciled: true,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
  const commitment: AgenticWalletAccountingLedgerReconciliationCommitment = {
    scope: 'agentic_wallet_accounting_ledger_reconciliation_commitment',
    reconciliationId: row.id,
    reconciliationFingerprint: row.reconciliationFingerprint,
    reconciliation,
    preparedAt: new Date(row.preparedAt),
    reconciliationEvidencePrepared: true,
    walletObservationAuthenticated: true,
    ledgerBalancesReconciled: true,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
  const stored = { commitment, recordedAt: new Date(row.recordedAt) };
  if (
    !isValidAgenticWalletAccountingLedgerReconciliation(reconciliation) ||
    !isValidAgenticWalletAccountingLedgerReconciliationCommitment(commitment) ||
    !isValidStoredAgenticWalletAccountingLedgerReconciliationCommitment(
      stored,
    ) ||
    row.requestFingerprint !== fingerprint(commitment)
  )
    throw new Error(
      'Persisted accounting ledger reconciliation commitment is invalid',
    );
  return stored;
}

function deserializeCurrentBalances(
  value: unknown,
): AgenticWalletAccountingLedgerBalance[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => {
    const balance =
      typeof entry === 'object' && entry !== null
        ? (entry as Record<string, unknown>)
        : {};
    return {
      ...(balance as unknown as AgenticWalletAccountingLedgerBalance),
      updatedAt: new Date(balance.updatedAt as string),
    };
  });
}

function deserializeBalances(
  value: unknown,
): AgenticWalletMarketSwapLocalAccountingBalance[] {
  if (!Array.isArray(value)) return [];
  return value.map((entry) =>
    typeof entry === 'object' && entry !== null
      ? ({ ...entry } as AgenticWalletMarketSwapLocalAccountingBalance)
      : ({} as AgenticWalletMarketSwapLocalAccountingBalance),
  );
}

function fingerprint(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  return value;
}
