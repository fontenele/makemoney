import { createHash } from 'node:crypto';
import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
  AgenticWalletAccountingBalanceInitialization,
} from './agentic-wallet-accounting-balance-initialization';
import { AgenticWalletAccountingBalanceInitializationIdentityError } from './agentic-wallet-accounting-balance-initialization.store';
import { PrismaAgenticWalletAccountingBalanceInitializationReadStore } from './prisma-agentic-wallet-accounting-balance-initialization-read.store';

const INITIALIZATION_ID = '018f1f54-7b8c-7a9d-8e0f-123456789abc';
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';

describe('Prisma Agentic Wallet accounting balance initialization reader', () => {
  it('loads and revalidates one initialized balance receipt', async () => {
    const harness = readerHarness(validRow());

    await expect(
      harness.reader.getByInitializationId(INITIALIZATION_ID),
    ).resolves.toMatchObject({
      scope: 'initialized_agentic_wallet_accounting_balances',
      initialization: { initializationId: INITIALIZATION_ID },
      accountingBalancesInitialized: true,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
    expect(harness.findUnique).toHaveBeenCalledWith({
      where: { id: INITIALIZATION_ID },
    });
  });

  it('returns explicit absence', async () => {
    const harness = readerHarness(null);
    await expect(
      harness.reader.getByInitializationId(INITIALIZATION_ID),
    ).resolves.toBeNull();
  });

  it.each([
    'invalid',
    INITIALIZATION_ID.toUpperCase(),
    `${INITIALIZATION_ID}0`,
  ])(
    'rejects invalid initialization identity %s before persistence access',
    async (initializationId) => {
      const harness = readerHarness(null);
      await expect(
        harness.reader.getByInitializationId(initializationId),
      ).rejects.toBeInstanceOf(
        AgenticWalletAccountingBalanceInitializationIdentityError,
      );
      expect(harness.findUnique).not.toHaveBeenCalled();
    },
  );

  it.each([
    ['provider', { providerId: 'other' }],
    ['balances', { balances: validInitialization().balances.slice(1) }],
    ['fingerprint', { requestFingerprint: '0'.repeat(64) }],
    ['chronology', { initializedAt: new Date('2026-10-16T12:00:31.000Z') }],
  ] as const)('rejects divergent persisted %s', async (_name, mutation) => {
    const harness = readerHarness({ ...validRow(), ...mutation });
    await expect(
      harness.reader.getByInitializationId(INITIALIZATION_ID),
    ).rejects.toThrow('Persisted accounting balance initialization is invalid');
  });

  it('returns defensive balance and date snapshots', async () => {
    const row = validRow();
    const initialized =
      await readerHarness(row).reader.getByInitializationId(INITIALIZATION_ID);
    if (initialized === null) throw new Error('Initialization was absent');

    expect(initialized.initialization.balances).not.toBe(row.balances);
    expect(initialized.initialization.walletObservedAt).not.toBe(
      row.walletObservedAt,
    );
    expect(initialized.initialization.preparedAt).not.toBe(row.preparedAt);
    expect(initialized.initializedAt).not.toBe(row.initializedAt);
  });
});

function readerHarness(row: ReturnType<typeof validRow> | null) {
  const findUnique = jest
    .fn<() => Promise<ReturnType<typeof validRow> | null>>()
    .mockResolvedValue(row);
  const prisma = {
    realExecutionAccountingBalanceInitialization: { findUnique },
  } as unknown as PrismaService;
  return {
    findUnique,
    reader: new PrismaAgenticWalletAccountingBalanceInitializationReadStore(
      prisma,
    ),
  };
}

function validRow() {
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
    initializedAt: new Date('2026-10-16T12:00:25.000Z'),
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
