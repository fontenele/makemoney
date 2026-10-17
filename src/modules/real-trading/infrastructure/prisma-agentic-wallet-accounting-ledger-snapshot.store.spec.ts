import { createHash } from 'node:crypto';
import { jest } from '@jest/globals';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
  AgenticWalletAccountingBalanceInitialization,
} from './agentic-wallet-accounting-balance-initialization';
import {
  AgenticWalletAccountingLedgerSnapshotIdentityError,
  AgenticWalletAccountingLedgerSnapshotInconsistentError,
} from './agentic-wallet-accounting-ledger-snapshot.store';
import { PrismaAgenticWalletAccountingLedgerSnapshotReadStore } from './prisma-agentic-wallet-accounting-ledger-snapshot.store';

const INITIALIZATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abc';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const INITIALIZED_AT = new Date('2026-10-16T12:00:25.000Z');
const EVALUATED_AT = new Date('2026-10-16T12:00:30.000Z');

describe('Prisma Agentic Wallet accounting ledger snapshot reader', () => {
  it('loads one receipt and the complete ledger in one repeatable-read transaction', async () => {
    const harness = readerHarness();

    await expect(
      harness.reader.getByInitializationId(INITIALIZATION_ID, EVALUATED_AT),
    ).resolves.toMatchObject({
      scope: 'agentic_wallet_accounting_ledger_snapshot',
      initializationId: INITIALIZATION_ID,
      ledgerCoverageComplete: true,
      accountingBalancesInitialized: true,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
    expect(harness.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
    expect(harness.initializationFindUnique).toHaveBeenCalledWith({
      where: { id: INITIALIZATION_ID },
    });
    expect(harness.balanceFindMany).toHaveBeenCalledWith({
      orderBy: { assetIdentity: 'asc' },
    });
  });

  it('returns explicit absence without reading ledger rows', async () => {
    const harness = readerHarness({ initialization: null });
    await expect(
      harness.reader.getByInitializationId(INITIALIZATION_ID, EVALUATED_AT),
    ).resolves.toBeNull();
    expect(harness.balanceFindMany).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid identity', 'invalid', EVALUATED_AT],
    ['uppercase identity', INITIALIZATION_ID.toUpperCase(), EVALUATED_AT],
    ['invalid evaluation time', INITIALIZATION_ID, new Date(Number.NaN)],
  ])('rejects %s before persistence access', async (_name, id, evaluatedAt) => {
    const harness = readerHarness();
    await expect(
      harness.reader.getByInitializationId(id, evaluatedAt),
    ).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerSnapshotIdentityError,
    );
    expect(harness.transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['missing balance', validBalances().slice(1)],
    [
      'extra balance',
      [
        ...validBalances(),
        {
          assetIdentity: 'native:ETH',
          assetType: 'native',
          assetAddress: null,
          assetSymbol: 'ETH',
          quantity: '1',
          updatedAt: INITIALIZED_AT,
        },
      ],
    ],
    [
      'divergent durable identity',
      validBalances().map((row, index) =>
        index === 0 ? { ...row, assetIdentity: 'native:ETH' } : row,
      ),
    ],
    [
      'future update',
      validBalances().map((row, index) =>
        index === 0
          ? { ...row, updatedAt: new Date('2026-10-16T12:00:31.000Z') }
          : row,
      ),
    ],
  ])('rejects an inconsistent ledger with %s', async (_name, balances) => {
    const harness = readerHarness({ balances });
    await expect(
      harness.reader.getByInitializationId(INITIALIZATION_ID, EVALUATED_AT),
    ).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerSnapshotInconsistentError,
    );
  });

  it('rejects a malformed persisted initialization receipt', async () => {
    const harness = readerHarness({
      initialization: {
        ...validInitializationRow(),
        requestFingerprint: '0'.repeat(64),
      },
    });
    await expect(
      harness.reader.getByInitializationId(INITIALIZATION_ID, EVALUATED_AT),
    ).rejects.toBeInstanceOf(
      AgenticWalletAccountingLedgerSnapshotInconsistentError,
    );
    expect(harness.balanceFindMany).not.toHaveBeenCalled();
  });

  it('returns defensive balance and date snapshots', async () => {
    const balances = validBalances();
    const snapshot = await readerHarness({
      balances,
    }).reader.getByInitializationId(INITIALIZATION_ID, EVALUATED_AT);
    if (snapshot === null) throw new Error('Snapshot was absent');

    expect(snapshot.currentBalances[0]).not.toBe(balances[0]);
    expect(snapshot.currentBalances[0].updatedAt).not.toBe(
      balances[0].updatedAt,
    );
    expect(snapshot.evaluatedAt).not.toBe(EVALUATED_AT);
  });
});

function readerHarness(
  overrides: {
    initialization?: ReturnType<typeof validInitializationRow> | null;
    balances?: ReturnType<typeof validBalances>;
  } = {},
) {
  const initializationFindUnique = jest
    .fn<() => Promise<ReturnType<typeof validInitializationRow> | null>>()
    .mockResolvedValue(
      overrides.initialization === undefined
        ? validInitializationRow()
        : overrides.initialization,
    );
  const balanceFindMany = jest
    .fn<() => Promise<ReturnType<typeof validBalances>>>()
    .mockResolvedValue(overrides.balances ?? validBalances());
  const tx = {
    realExecutionAccountingBalanceInitialization: {
      findUnique: initializationFindUnique,
    },
    realExecutionAccountingBalance: { findMany: balanceFindMany },
  };
  const transaction = jest.fn((callback: (client: typeof tx) => unknown) =>
    Promise.resolve(callback(tx)),
  );
  const prisma = { $transaction: transaction } as unknown as PrismaService;
  return {
    reader: new PrismaAgenticWalletAccountingLedgerSnapshotReadStore(prisma),
    transaction,
    initializationFindUnique,
    balanceFindMany,
  };
}

function validBalances() {
  return [
    {
      assetIdentity: 'native:BNB',
      assetType: 'native',
      assetAddress: null,
      assetSymbol: 'BNB',
      quantity: '2',
      updatedAt: INITIALIZED_AT,
    },
    {
      assetIdentity: `token:${USDT}`,
      assetType: 'token',
      assetAddress: USDT,
      assetSymbol: null,
      quantity: '1000.5',
      updatedAt: INITIALIZED_AT,
    },
    {
      assetIdentity: `token:${BTCB}`,
      assetType: 'token',
      assetAddress: BTCB,
      assetSymbol: null,
      quantity: '0.125',
      updatedAt: INITIALIZED_AT,
    },
  ];
}

function validInitializationRow() {
  const initialization = validInitialization();
  return {
    id: initialization.initializationId,
    providerId: initialization.providerId,
    chainId: initialization.chainId,
    acknowledgment: initialization.acknowledgment,
    balances: initialization.balances,
    walletObservedAt: initialization.walletObservedAt,
    maximumObservationAgeMs: initialization.maximumObservationAgeMs,
    preparedAt: initialization.preparedAt,
    requestFingerprint: fingerprint(initialization),
    initializedAt: INITIALIZED_AT,
  };
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

function fingerprint(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value))
    return value
      .map(canonicalize)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  return value;
}
