import { createHash } from 'node:crypto';

import { jest } from '@jest/globals';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
  AgenticWalletAccountingBalanceInitialization,
} from './agentic-wallet-accounting-balance-initialization';
import {
  AgenticWalletAccountingLedgerReconciliation,
  reconcileAgenticWalletAccountingLedger,
} from './agentic-wallet-accounting-ledger-reconciliation';
import {
  AgenticWalletAccountingLedgerReconciliationCommitment,
  prepareAgenticWalletAccountingLedgerReconciliationCommitment,
} from './agentic-wallet-accounting-ledger-reconciliation-commitment';
import {
  AgenticWalletAccountingLedgerReconciliationCommitmentBlockedError,
  AgenticWalletAccountingLedgerReconciliationCommitmentConflictError,
  AgenticWalletAccountingLedgerReconciliationInitializationNotFoundError,
} from './agentic-wallet-accounting-ledger-reconciliation-commitment.store';
import {
  AgenticWalletAccountingLedgerBalance,
  assessAgenticWalletAccountingLedgerSnapshot,
} from './agentic-wallet-accounting-ledger-snapshot';
import { AgenticWalletCapabilityObservation } from './agentic-wallet-capability.adapter';
import { PrismaAgenticWalletAccountingLedgerReconciliationCommitmentStore } from './prisma-agentic-wallet-accounting-ledger-reconciliation-commitment.store';

const INITIALIZATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abc';
const RECONCILIATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abd';
const OTHER_RECONCILIATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abe';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const INITIALIZED_AT = new Date('2026-10-16T12:00:25.000Z');
const EVALUATED_AT = new Date('2026-10-16T12:00:55.000Z');
const RECONCILED_AT = new Date('2026-10-16T12:01:00.000Z');
const PREPARED_AT = new Date('2026-10-16T12:01:01.000Z');
const RECORDED_AT = new Date('2026-10-16T12:01:02.000Z');

describe('PrismaAgenticWalletAccountingLedgerReconciliationCommitmentStore', () => {
  it('persists only after revalidating initialization and current durable balances', async () => {
    const harness = repositoryHarness();
    const value = commitment();

    await expect(harness.store.record(value)).resolves.toMatchObject({
      stored: { commitment: value, recordedAt: RECORDED_AT },
      replayed: false,
    });
    expect(harness.initializationFindUnique).toHaveBeenCalledWith({
      where: { id: INITIALIZATION_ID },
    });
    expect(harness.balanceFindMany).toHaveBeenCalledWith({
      orderBy: { assetIdentity: 'asc' },
    });
    expect(harness.create.mock.calls[0][0].data).toMatchObject({
      id: RECONCILIATION_ID,
      initializationId: INITIALIZATION_ID,
      reconciliationFingerprint: value.reconciliationFingerprint,
      preparedAt: PREPARED_AT,
      recordedAt: RECORDED_AT,
    });
    expect(harness.prismaTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('replays the exact immutable commitment without reloading durable state', async () => {
    const harness = repositoryHarness();
    const value = commitment();
    await harness.store.record(value);
    harness.existingFindFirst.mockResolvedValue(
      reconciliationRow(harness.create.mock.calls[0][0].data),
    );
    harness.create.mockClear();
    harness.initializationFindUnique.mockClear();
    harness.balanceFindMany.mockClear();

    await expect(harness.store.record(value)).resolves.toMatchObject({
      stored: { commitment: { reconciliationId: RECONCILIATION_ID } },
      replayed: true,
    });
    expect(harness.create).not.toHaveBeenCalled();
    expect(harness.initializationFindUnique).not.toHaveBeenCalled();
    expect(harness.balanceFindMany).not.toHaveBeenCalled();
  });

  it('rejects divergent reuse of a reconciliation identity', async () => {
    const harness = repositoryHarness();
    harness.existingFindFirst.mockResolvedValue(
      reconciliationRow({ requestFingerprint: 'f'.repeat(64) }),
    );

    await expect(harness.store.record(commitment())).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerReconciliationCommitmentConflictError,
    );
    expect(harness.initializationFindUnique).not.toHaveBeenCalled();
  });

  it('rejects a duplicate evidence fingerprint under another identity', async () => {
    const harness = repositoryHarness();
    harness.existingFindFirst.mockResolvedValue(
      reconciliationRow({
        id: OTHER_RECONCILIATION_ID,
        requestFingerprint: 'f'.repeat(64),
      }),
    );

    await expect(harness.store.record(commitment())).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerReconciliationCommitmentConflictError,
    );
  });

  it('rejects an invalid commitment before persistence access', async () => {
    const harness = repositoryHarness();
    const malformed = {
      ...commitment(),
      reconciliationFingerprint: 'f'.repeat(64),
    };

    await expect(harness.store.record(malformed)).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerReconciliationCommitmentBlockedError,
    );
    expect(harness.prismaTransaction).not.toHaveBeenCalled();
  });

  it('rejects absent durable initialization', async () => {
    const harness = repositoryHarness();
    harness.initializationFindUnique.mockResolvedValue(null);

    await expect(harness.store.record(commitment())).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerReconciliationInitializationNotFoundError,
    );
    expect(harness.balanceFindMany).not.toHaveBeenCalled();
  });

  it('rejects reconciliation that differs from current durable balances', async () => {
    const harness = repositoryHarness();
    harness.balanceFindMany.mockResolvedValue(
      balanceRows().map((row, index) =>
        index === 0 ? { ...row, quantity: '1.8' } : row,
      ),
    );

    await expect(harness.store.record(commitment())).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerReconciliationCommitmentBlockedError,
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects recording time before commitment preparation', async () => {
    const harness = repositoryHarness(new Date('2026-10-16T12:01:00.999Z'));

    await expect(harness.store.record(commitment())).rejects.toThrow(
      'Accounting ledger reconciliation recording metadata is invalid',
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects malformed persisted commitment during replay', async () => {
    const harness = repositoryHarness();
    const value = commitment();
    await harness.store.record(value);
    harness.existingFindFirst.mockResolvedValue(
      reconciliationRow({
        ...harness.create.mock.calls[0][0].data,
        walletBalances: [],
      }),
    );

    await expect(harness.store.record(value)).rejects.toThrow(
      'Persisted accounting ledger reconciliation commitment is invalid',
    );
  });
});

function repositoryHarness(recordedAt = RECORDED_AT) {
  const existingFindFirst = jest
    .fn<() => Promise<ReconciliationRow | null>>()
    .mockResolvedValue(null);
  const initializationFindUnique = jest
    .fn<() => Promise<InitializationRow | null>>()
    .mockResolvedValue(initializationRow());
  const balanceFindMany = jest
    .fn<() => Promise<BalanceRow[]>>()
    .mockResolvedValue(balanceRows());
  const create = jest.fn(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(reconciliationRow(data)),
  );
  const tx = {
    $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    realExecutionAccountingLedgerReconciliation: {
      findFirst: existingFindFirst,
      create,
    },
    realExecutionAccountingBalanceInitialization: {
      findUnique: initializationFindUnique,
    },
    realExecutionAccountingBalance: { findMany: balanceFindMany },
  };
  const prismaTransaction = jest.fn(
    async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  );
  const prisma = {
    $transaction: prismaTransaction,
  } as unknown as PrismaService;
  return {
    balanceFindMany,
    create,
    existingFindFirst,
    initializationFindUnique,
    prismaTransaction,
    store: new PrismaAgenticWalletAccountingLedgerReconciliationCommitmentStore(
      prisma,
      () => recordedAt,
    ),
  };
}

function commitment(): AgenticWalletAccountingLedgerReconciliationCommitment {
  const assessment =
    prepareAgenticWalletAccountingLedgerReconciliationCommitment(
      validReconciliation(),
      RECONCILIATION_ID,
      PREPARED_AT,
    );
  if (assessment.commitment === null) throw new Error('Commitment was blocked');
  return assessment.commitment;
}

function validReconciliation(): AgenticWalletAccountingLedgerReconciliation {
  const initialized = {
    scope: 'initialized_agentic_wallet_accounting_balances' as const,
    initialization: validInitialization(),
    initializedAt: INITIALIZED_AT,
    accountingBalancesInitialized: true as const,
    quoteAuthorized: false as const,
    submissionAuthorized: false as const,
  };
  const snapshot = assessAgenticWalletAccountingLedgerSnapshot(
    initialized,
    validBalances(),
    EVALUATED_AT,
  ).snapshot;
  if (snapshot === null) throw new Error('Snapshot was blocked');
  const reconciliation = reconcileAgenticWalletAccountingLedger(
    snapshot,
    validObservation(),
    { maximumObservationAgeMs: 30_000, evaluatedAt: RECONCILED_AT },
  ).reconciliation;
  if (reconciliation === null) throw new Error('Reconciliation was blocked');
  return reconciliation;
}

function validInitialization(): AgenticWalletAccountingBalanceInitialization {
  return {
    scope: 'agentic_wallet_accounting_balance_initialization',
    initializationId: INITIALIZATION_ID,
    providerId: 'agentic_wallet',
    chainId: '56',
    acknowledgment: ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
    balances: [
      { assetType: 'native', assetSymbol: 'BNB', currentQuantity: '2' },
      { assetType: 'token', assetAddress: USDT, currentQuantity: '1000.5' },
      { assetType: 'token', assetAddress: BTCB, currentQuantity: '0.125' },
    ],
    balanceCoverageComplete: true,
    walletObservedAt: new Date('2026-10-16T12:00:00.000Z'),
    maximumObservationAgeMs: 30_000,
    preparedAt: new Date('2026-10-16T12:00:20.000Z'),
    accountingBalanceInitializationPrepared: true,
    accountingBalancesInitialized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function validBalances(): AgenticWalletAccountingLedgerBalance[] {
  const updatedAt = new Date('2026-10-16T12:00:50.000Z');
  return [
    {
      assetType: 'native',
      assetSymbol: 'BNB',
      currentQuantity: '1.9',
      updatedAt,
    },
    {
      assetType: 'token',
      assetAddress: USDT,
      currentQuantity: '900',
      updatedAt,
    },
    {
      assetType: 'token',
      assetAddress: BTCB,
      currentQuantity: '0.126',
      updatedAt,
    },
  ];
}

function validObservation(): AgenticWalletCapabilityObservation {
  return {
    cliVersion: '1.10.0',
    requiredCliVersion: '1.10.0',
    capabilities: {
      providerId: 'agentic_wallet',
      connected: true,
      chains: [{ chainId: '56', operations: [] }],
      reads: {
        securitySettings: true,
        quota: true,
        balances: true,
        gas: true,
      },
      observedAt: new Date('2026-10-16T12:00:55.000Z'),
    },
    settings: null,
    quota: null,
    addresses: [{ chainId: '56', address: '0xwallet' }],
    balances: [
      { chainId: '56', tokenAddress: USDT, symbol: 'USDT', quantity: '900' },
      { chainId: '56', tokenAddress: BTCB, symbol: 'BTCB', quantity: '0.126' },
      {
        chainId: '56',
        tokenAddress: 'native-bnb',
        symbol: 'BNB',
        quantity: '1.9',
      },
    ],
    gas: null,
  };
}

function initializationRow(): InitializationRow {
  const value = validInitialization();
  return {
    id: INITIALIZATION_ID,
    providerId: 'agentic_wallet',
    chainId: '56',
    acknowledgment: value.acknowledgment,
    balances: value.balances,
    walletObservedAt: value.walletObservedAt,
    maximumObservationAgeMs: value.maximumObservationAgeMs,
    preparedAt: value.preparedAt,
    requestFingerprint: initializationFingerprint(value),
    initializedAt: INITIALIZED_AT,
  };
}

function balanceRows(): BalanceRow[] {
  return validBalances().map((balance) => ({
    assetIdentity:
      balance.assetType === 'token'
        ? `token:${balance.assetAddress}`
        : `native:${balance.assetSymbol}`,
    assetType: balance.assetType,
    assetAddress: balance.assetType === 'token' ? balance.assetAddress : null,
    assetSymbol: balance.assetType === 'native' ? balance.assetSymbol : null,
    quantity: balance.currentQuantity,
    updatedAt: balance.updatedAt,
  }));
}

function reconciliationRow(
  overrides: Record<string, unknown> = {},
): ReconciliationRow {
  const value = commitment();
  const snapshot = value.reconciliation.ledgerSnapshot;
  return {
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
    requestFingerprint: fingerprint(value),
    recordedAt: RECORDED_AT,
    ...overrides,
  };
}

function fingerprint(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function initializationFingerprint(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalizeInitialization(value)))
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

function canonicalizeInitialization(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value))
    return value
      .map(canonicalizeInitialization)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalizeInitialization(entry)]),
    );
  return value;
}

type InitializationRow = {
  id: string;
  providerId: string;
  chainId: string;
  acknowledgment: string;
  balances: unknown;
  walletObservedAt: Date;
  maximumObservationAgeMs: number;
  preparedAt: Date;
  requestFingerprint: string;
  initializedAt: Date;
};
type BalanceRow = {
  assetIdentity: string;
  assetType: string;
  assetAddress: string | null;
  assetSymbol: string | null;
  quantity: string;
  updatedAt: Date;
};
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
