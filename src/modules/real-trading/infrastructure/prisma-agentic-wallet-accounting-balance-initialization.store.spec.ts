import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
  AgenticWalletAccountingBalanceInitialization,
} from './agentic-wallet-accounting-balance-initialization';
import {
  AgenticWalletAccountingBalanceInitializationBlockedError,
  AgenticWalletAccountingBalanceInitializationConflictError,
  AgenticWalletAccountingBalanceInitializationStaleError,
} from './agentic-wallet-accounting-balance-initialization.store';
import { PrismaAgenticWalletAccountingBalanceInitializationStore } from './prisma-agentic-wallet-accounting-balance-initialization.store';

const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';

describe('Prisma Agentic Wallet accounting balance initialization store', () => {
  it('atomically initializes the exact three balances and records a receipt', async () => {
    const initialization = validInitialization();
    const tx = transactionDouble();
    const store = storeWith(tx);

    const result = await store.initialize(initialization);

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(tx.realExecutionAccountingBalance.create).toHaveBeenCalledTimes(3);
    expect(tx.createdBalances[0]).toMatchObject({
      assetIdentity: 'native:BNB',
      quantity: '2',
    });
    expect(result.replayed).toBe(false);
    expect(result.initialized.accountingBalancesInitialized).toBe(true);
    expect(result.initialized.quoteAuthorized).toBe(false);
    expect(result.initialized.submissionAuthorized).toBe(false);
  });

  it('returns an exact durable replay without inserting balances again', async () => {
    const initialization = validInitialization();
    const tx = transactionDouble();
    const first = await storeWith(tx).initialize(initialization);
    tx.replayCreatedInitialization();

    const replay = await storeWith(tx).initialize(initialization);

    expect(replay.replayed).toBe(true);
    expect(replay.initialized).toEqual(first.initialized);
    expect(tx.realExecutionAccountingBalance.create).toHaveBeenCalledTimes(3);
  });

  it('rejects changed reuse and a pre-existing ledger', async () => {
    const initialization = validInitialization();
    const tx = transactionDouble();
    await storeWith(tx).initialize(initialization);
    tx.replayCreatedInitialization('0'.repeat(64));
    await expect(
      storeWith(tx).initialize(initialization),
    ).rejects.toBeInstanceOf(
      AgenticWalletAccountingBalanceInitializationConflictError,
    );

    tx.realExecutionAccountingBalanceInitialization.findFirst.mockResolvedValue(
      null,
    );
    tx.realExecutionAccountingBalance.count.mockResolvedValue(1);
    await expect(
      storeWith(tx).initialize(initialization),
    ).rejects.toBeInstanceOf(
      AgenticWalletAccountingBalanceInitializationConflictError,
    );
  });

  it('rejects malformed and stale input before any balance write', async () => {
    const tx = transactionDouble();
    await expect(
      storeWith(tx).initialize({
        ...validInitialization(),
        submissionAuthorized: true,
      } as unknown as AgenticWalletAccountingBalanceInitialization),
    ).rejects.toBeInstanceOf(
      AgenticWalletAccountingBalanceInitializationBlockedError,
    );
    expect(tx.$executeRaw).not.toHaveBeenCalled();

    await expect(
      storeWith(tx, new Date('2026-10-16T12:00:30.001Z')).initialize(
        validInitialization(),
      ),
    ).rejects.toBeInstanceOf(
      AgenticWalletAccountingBalanceInitializationStaleError,
    );
    expect(tx.realExecutionAccountingBalance.create).not.toHaveBeenCalled();
  });
});

function storeWith(
  tx: ReturnType<typeof transactionDouble>,
  now = new Date('2026-10-16T12:00:25.000Z'),
) {
  const prisma = {
    $transaction: jest.fn((operation: (value: typeof tx) => unknown) =>
      Promise.resolve(operation(tx)),
    ),
  } as unknown as PrismaService;
  return new PrismaAgenticWalletAccountingBalanceInitializationStore(
    prisma,
    () => new Date(now),
  );
}

function transactionDouble() {
  let createdInitialization: Record<string, unknown> | null = null;
  const createdBalances: Record<string, unknown>[] = [];
  const findFirst = jest.fn<() => Promise<Record<string, unknown> | null>>(() =>
    Promise.resolve(null),
  );
  const initializationCreate = jest.fn(
    ({ data }: { data: Record<string, unknown> }) => {
      createdInitialization = { ...data };
      return Promise.resolve(createdInitialization);
    },
  );
  return {
    createdBalances,
    replayCreatedInitialization(requestFingerprint?: string) {
      if (createdInitialization === null)
        throw new Error('Missing created row');
      findFirst.mockResolvedValue({
        ...createdInitialization,
        ...(requestFingerprint === undefined ? {} : { requestFingerprint }),
      });
    },
    $executeRaw: jest.fn().mockResolvedValue(1),
    realExecutionAccountingBalanceInitialization: {
      findFirst,
      create: initializationCreate,
    },
    realExecutionAccountingBalance: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) => {
        createdBalances.push(data);
        return Promise.resolve(data);
      }),
    },
  };
}

function validInitialization(): AgenticWalletAccountingBalanceInitialization {
  return {
    scope: 'agentic_wallet_accounting_balance_initialization',
    initializationId: '018f1f54-7b8c-7a9d-8e0f-123456789abc',
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
