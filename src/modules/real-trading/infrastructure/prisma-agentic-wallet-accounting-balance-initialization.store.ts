import { createHash } from 'node:crypto';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletAccountingBalanceInitialization,
  isValidAgenticWalletAccountingBalanceInitialization,
} from './agentic-wallet-accounting-balance-initialization';
import {
  AgenticWalletAccountingBalanceInitializationBlockedError,
  AgenticWalletAccountingBalanceInitializationConflictError,
  AgenticWalletAccountingBalanceInitializationStaleError,
  AgenticWalletAccountingBalanceInitializationStore,
  InitializedAgenticWalletAccountingBalances,
} from './agentic-wallet-accounting-balance-initialization.store';

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

export class PrismaAgenticWalletAccountingBalanceInitializationStore implements AgenticWalletAccountingBalanceInitializationStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async initialize(
    initialization: AgenticWalletAccountingBalanceInitialization,
  ): Promise<{
    initialized: InitializedAgenticWalletAccountingBalances;
    replayed: boolean;
  }> {
    if (!isValidAgenticWalletAccountingBalanceInitialization(initialization))
      throw new AgenticWalletAccountingBalanceInitializationBlockedError();
    const requestFingerprint = fingerprint(initialization);

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261016, 99)`;
        const existing =
          await tx.realExecutionAccountingBalanceInitialization.findFirst({
            where: {
              OR: [
                { id: initialization.initializationId },
                {
                  providerId: initialization.providerId,
                  chainId: initialization.chainId,
                },
              ],
            },
          });
        if (existing) {
          if (existing.requestFingerprint !== requestFingerprint)
            throw new AgenticWalletAccountingBalanceInitializationConflictError();
          return { initialized: mapPersisted(existing), replayed: true };
        }

        const initializedAt = this.now();
        if (
          !(initializedAt instanceof Date) ||
          !Number.isFinite(initializedAt.getTime()) ||
          initializedAt.getTime() < initialization.preparedAt.getTime() ||
          initializedAt.getTime() - initialization.walletObservedAt.getTime() >
            initialization.maximumObservationAgeMs
        )
          throw new AgenticWalletAccountingBalanceInitializationStaleError();

        if ((await tx.realExecutionAccountingBalance.count()) !== 0)
          throw new AgenticWalletAccountingBalanceInitializationConflictError();

        for (const balance of initialization.balances) {
          await tx.realExecutionAccountingBalance.create({
            data: {
              assetIdentity: identity(balance),
              assetType: balance.assetType,
              assetAddress:
                balance.assetType === 'token' ? balance.assetAddress : null,
              assetSymbol:
                balance.assetType === 'native' ? balance.assetSymbol : null,
              quantity: balance.currentQuantity,
              updatedAt: initializedAt,
            },
          });
        }
        const created =
          await tx.realExecutionAccountingBalanceInitialization.create({
            data: {
              id: initialization.initializationId,
              providerId: initialization.providerId,
              chainId: initialization.chainId,
              acknowledgment: initialization.acknowledgment,
              balances: initialization.balances,
              walletObservedAt: initialization.walletObservedAt,
              maximumObservationAgeMs: initialization.maximumObservationAgeMs,
              preparedAt: initialization.preparedAt,
              requestFingerprint,
              initializedAt,
            },
          });
        return { initialized: mapPersisted(created), replayed: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

export function mapPersistedAgenticWalletAccountingBalanceInitialization(
  row: InitializationRow,
): InitializedAgenticWalletAccountingBalances {
  return mapPersisted(row);
}

function mapPersisted(
  row: InitializationRow,
): InitializedAgenticWalletAccountingBalances {
  const initialization: AgenticWalletAccountingBalanceInitialization = {
    scope: 'agentic_wallet_accounting_balance_initialization',
    initializationId: row.id,
    providerId: row.providerId as 'agentic_wallet',
    chainId: row.chainId as '56',
    acknowledgment:
      row.acknowledgment as AgenticWalletAccountingBalanceInitialization['acknowledgment'],
    balances:
      row.balances as AgenticWalletAccountingBalanceInitialization['balances'],
    balanceCoverageComplete: true,
    walletObservedAt: new Date(row.walletObservedAt),
    maximumObservationAgeMs: row.maximumObservationAgeMs,
    preparedAt: new Date(row.preparedAt),
    accountingBalanceInitializationPrepared: true,
    accountingBalancesInitialized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
  if (
    !isValidAgenticWalletAccountingBalanceInitialization(initialization) ||
    row.requestFingerprint !== fingerprint(initialization) ||
    !(row.initializedAt instanceof Date) ||
    !Number.isFinite(row.initializedAt.getTime()) ||
    row.initializedAt.getTime() < initialization.preparedAt.getTime() ||
    row.initializedAt.getTime() - initialization.walletObservedAt.getTime() >
      initialization.maximumObservationAgeMs
  )
    throw new Error('Persisted accounting balance initialization is invalid');
  return {
    scope: 'initialized_agentic_wallet_accounting_balances',
    initialization: {
      ...initialization,
      balances: initialization.balances.map((balance) => ({ ...balance })),
      walletObservedAt: new Date(initialization.walletObservedAt),
      preparedAt: new Date(initialization.preparedAt),
    },
    initializedAt: new Date(row.initializedAt),
    accountingBalancesInitialized: true,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function identity(
  balance: AgenticWalletAccountingBalanceInitialization['balances'][number],
): string {
  return balance.assetType === 'token'
    ? `token:${balance.assetAddress}`
    : `native:${balance.assetSymbol}`;
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
