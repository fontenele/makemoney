import { createHash } from 'node:crypto';

import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletAccountingLedgerReconciliation,
  isValidAgenticWalletAccountingLedgerReconciliation,
} from './agentic-wallet-accounting-ledger-reconciliation';
import { prepareAgenticWalletAccountingLedgerReconciliationCommitment } from './agentic-wallet-accounting-ledger-reconciliation-commitment';
import { AgenticWalletAccountingLedgerReconciliationCommitmentIdentityError } from './agentic-wallet-accounting-ledger-reconciliation-commitment.store';
import { PrismaAgenticWalletAccountingLedgerReconciliationCommitmentReadStore } from './prisma-agentic-wallet-accounting-ledger-reconciliation-commitment-read.store';

const INITIALIZATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abc';
const RECONCILIATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abd';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';

describe('PrismaAgenticWalletAccountingLedgerReconciliationCommitmentReadStore', () => {
  it('returns a fully reconstructed defensive stored commitment', async () => {
    const row = persistedRow();
    const harness = readerHarness(row);

    const stored =
      await harness.reader.getByReconciliationId(RECONCILIATION_ID);
    expect(stored).toMatchObject({
      commitment: {
        reconciliationId: RECONCILIATION_ID,
        reconciliation: { initializationId: INITIALIZATION_ID },
        ledgerBalancesReconciled: true,
        quoteAuthorized: false,
        submissionAuthorized: false,
      },
      recordedAt: new Date('2026-10-16T12:01:02.000Z'),
    });
    expect(stored?.commitment.reconciliation.walletBalances).not.toBe(
      row.walletBalances,
    );
    expect(harness.findUnique).toHaveBeenCalledWith({
      where: { id: RECONCILIATION_ID },
    });
  });

  it('returns explicit absence for an unknown valid identity', async () => {
    const harness = readerHarness(null);
    await expect(
      harness.reader.getByReconciliationId(RECONCILIATION_ID),
    ).resolves.toBeNull();
  });

  it.each(['invalid', RECONCILIATION_ID.toUpperCase()])(
    'rejects invalid identity %s before persistence access',
    async (identity) => {
      const harness = readerHarness(null);
      await expect(
        harness.reader.getByReconciliationId(identity),
      ).rejects.toBeInstanceOf(
        AgenticWalletAccountingLedgerReconciliationCommitmentIdentityError,
      );
      expect(harness.findUnique).not.toHaveBeenCalled();
    },
  );

  it('rejects malformed persisted evidence', async () => {
    const harness = readerHarness(
      persistedRow({ reconciliationFingerprint: 'f'.repeat(64) }),
    );
    await expect(
      harness.reader.getByReconciliationId(RECONCILIATION_ID),
    ).rejects.toThrow(
      'Persisted accounting ledger reconciliation commitment is invalid',
    );
  });

  it('rejects a row whose returned identity diverges from the request', async () => {
    const divergentId = '018f1f54-7b8c-7a9d-8e0f-123456789abe';
    const harness = readerHarness(persistedRow({}, divergentId));
    await expect(
      harness.reader.getByReconciliationId(RECONCILIATION_ID),
    ).rejects.toThrow(
      'Persisted accounting ledger reconciliation commitment identity diverges',
    );
  });
});

function readerHarness(row: ReconciliationRow | null) {
  const findUnique = jest
    .fn<() => Promise<ReconciliationRow | null>>()
    .mockResolvedValue(row);
  const prisma = {
    realExecutionAccountingLedgerReconciliation: { findUnique },
  } as unknown as PrismaService;
  return {
    findUnique,
    reader:
      new PrismaAgenticWalletAccountingLedgerReconciliationCommitmentReadStore(
        prisma,
      ),
  };
}

function persistedRow(
  overrides: Partial<ReconciliationRow> = {},
  reconciliationId = RECONCILIATION_ID,
): ReconciliationRow {
  const commitment = validCommitment(reconciliationId);
  const snapshot = commitment.reconciliation.ledgerSnapshot;
  return {
    id: commitment.reconciliationId,
    initializationId: commitment.reconciliation.initializationId,
    providerId: commitment.reconciliation.providerId,
    chainId: commitment.reconciliation.chainId,
    reconciliationFingerprint: commitment.reconciliationFingerprint,
    initialBalances: snapshot.initialBalances,
    currentBalances: snapshot.currentBalances.map((balance) => ({
      ...balance,
      updatedAt: balance.updatedAt.toISOString(),
    })),
    initializedAt: snapshot.initializedAt,
    evaluatedAt: snapshot.evaluatedAt,
    walletBalances: commitment.reconciliation.walletBalances,
    walletObservedAt: commitment.reconciliation.walletObservedAt,
    reconciledAt: commitment.reconciliation.reconciledAt,
    preparedAt: commitment.preparedAt,
    requestFingerprint: fingerprint(commitment),
    recordedAt: new Date('2026-10-16T12:01:02.000Z'),
    ...overrides,
  };
}

function validCommitment(reconciliationId = RECONCILIATION_ID) {
  const reconciliation = validReconciliation();
  const assessment =
    prepareAgenticWalletAccountingLedgerReconciliationCommitment(
      reconciliation,
      reconciliationId,
      new Date('2026-10-16T12:01:01.000Z'),
    );
  if (assessment.commitment === null) throw new Error('Commitment was blocked');
  return assessment.commitment;
}

function validReconciliation(): AgenticWalletAccountingLedgerReconciliation {
  const initializedAt = new Date('2026-10-16T12:00:25.000Z');
  const evaluatedAt = new Date('2026-10-16T12:00:55.000Z');
  const updatedAt = new Date('2026-10-16T12:00:50.000Z');
  const reconciliation: AgenticWalletAccountingLedgerReconciliation = {
    scope: 'agentic_wallet_accounting_ledger_reconciliation',
    initializationId: INITIALIZATION_ID,
    providerId: 'agentic_wallet',
    chainId: '56',
    ledgerSnapshot: {
      scope: 'agentic_wallet_accounting_ledger_snapshot',
      initializationId: INITIALIZATION_ID,
      providerId: 'agentic_wallet',
      chainId: '56',
      initialBalances: balances('2', '1000.5', '0.125'),
      currentBalances: balances('1.9', '900', '0.126').map((balance) => ({
        ...balance,
        updatedAt,
      })),
      initializedAt,
      evaluatedAt,
      ledgerCoverageComplete: true,
      accountingBalancesInitialized: true,
      quoteAuthorized: false,
      submissionAuthorized: false,
    },
    walletBalances: balances('1.9', '900', '0.126'),
    walletObservedAt: evaluatedAt,
    reconciledAt: new Date('2026-10-16T12:01:00.000Z'),
    walletObservationAuthenticated: true,
    ledgerBalancesReconciled: true,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
  if (!isValidAgenticWalletAccountingLedgerReconciliation(reconciliation))
    throw new Error('Reconciliation fixture is invalid');
  return reconciliation;
}

function balances(bnb: string, usdt: string, btcb: string) {
  return [
    {
      assetType: 'native' as const,
      assetSymbol: 'BNB' as const,
      currentQuantity: bnb,
    },
    { assetType: 'token' as const, assetAddress: USDT, currentQuantity: usdt },
    { assetType: 'token' as const, assetAddress: BTCB, currentQuantity: btcb },
  ];
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
