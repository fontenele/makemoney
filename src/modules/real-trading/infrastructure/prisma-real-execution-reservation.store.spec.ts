import { jest } from '@jest/globals';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  RealExecutionReservationCapacityError,
  RealExecutionReservationCommand,
  RealExecutionReservationIdempotencyConflictError,
  RealExecutionReservationIdentityConflictError,
} from '../application/real-execution-reservation-store';
import { PrismaRealExecutionReservationStore } from './prisma-real-execution-reservation.store';

const NOW = new Date('2026-10-01T14:00:02.000Z');
const CREATED_AT = new Date('2026-10-01T14:00:02.100Z');
const USDT_ADDRESS = '0x55d398326f99059ff775485246999027b3197955';
const BTCB_ADDRESS = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';

describe('PrismaRealExecutionReservationStore', () => {
  it('serializes capacity assessment and persists one immutable reservation', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionReservation.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(row(data)),
    );

    await expect(harness.store.reserve(command())).resolves.toEqual({
      reservation: publicReservation(),
      replayed: false,
    });
    expect(harness.tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(harness.tx.realExecutionReservation.findMany).toHaveBeenCalledWith({
      where: {
        providerId: 'agentic_wallet',
        chainId: '56',
        utcDay: new Date('2026-10-01T00:00:00.000Z'),
        expiresAt: { gt: NOW },
      },
      orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
      take: 101,
    });
    const createdData = harness.create.mock.calls[0][0].data;
    expect(createdData).toMatchObject({
      providerId: 'agentic_wallet',
      chainId: '56',
      intentId: '11111111-1111-4111-8111-111111111111',
      quoteId: '22222222-2222-4222-8222-222222222222',
      idempotencyKey: 'durable-reservation-1',
      payloadCommitmentVersion: 'real_execution_intent_quote_v1',
      budgetChargeUsdt: '5.105',
      sourceQuantity: '5.005',
      nativeGasQuantity: '0.0002',
      providerQuotaUsd: '5.2',
    });
    expect(createdData.requestFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(createdData.payloadCommitmentDigest).toMatch(/^[0-9a-f]{64}$/);
    expect(harness.prismaTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('replays the exact idempotency request even after quote expiry', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionReservation.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(row(data)),
    );
    await harness.store.reserve(command());
    const stored = harness.create.mock.calls[0][0].data;
    harness.tx.realExecutionReservation.findUnique.mockResolvedValue(
      row(stored),
    );
    const laterStore = new PrismaRealExecutionReservationStore(
      harness.prisma,
      () => new Date('2026-10-01T14:01:00.000Z'),
    );

    await expect(laterStore.reserve(command())).resolves.toEqual({
      reservation: publicReservation(),
      replayed: true,
    });
    expect(harness.tx.realExecutionReservation.create).toHaveBeenCalledTimes(1);
  });

  it('uses property-order-independent canonical request fingerprints', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionReservation.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(row(data)),
    );
    const original = command();
    await harness.store.reserve(original);
    const stored = harness.create.mock.calls[0][0].data;
    harness.tx.realExecutionReservation.findUnique.mockResolvedValue(
      row(stored),
    );
    const reorderedIntent = {
      createdAt: original.intent.createdAt,
      maxSlippageRate: original.intent.maxSlippageRate,
      sourceQuantity: original.intent.sourceQuantity,
      targetAsset: original.intent.targetAsset,
      sourceAsset: {
        symbol: original.intent.sourceAsset.symbol,
        tokenAddress: original.intent.sourceAsset.tokenAddress,
      },
      chainId: original.intent.chainId,
      kind: original.intent.kind,
      idempotencyKey: original.intent.idempotencyKey,
      id: original.intent.id,
    };
    const reordered: RealExecutionReservationCommand = {
      freshness: original.freshness,
      quotaSnapshot: original.quotaSnapshot,
      resourceSnapshot: original.resourceSnapshot,
      budgetSnapshot: original.budgetSnapshot,
      limits: original.limits,
      quote: { ...original.quote, intent: reorderedIntent },
      intent: reorderedIntent,
    };

    await expect(harness.store.reserve(reordered)).resolves.toMatchObject({
      replayed: true,
    });
  });

  it('fails closed when replay encounters a legacy reservation without a commitment', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionReservation.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(row(data)),
    );
    await harness.store.reserve(command());
    const stored = harness.create.mock.calls[0][0].data;
    harness.tx.realExecutionReservation.findUnique.mockResolvedValue(
      row({
        ...stored,
        payloadCommitmentVersion: null,
        payloadCommitmentDigest: null,
      }),
    );

    await expect(harness.store.reserve(command())).rejects.toThrow(
      'invalid payload commitment',
    );
  });

  it('rejects conflicting idempotency and intent or quote reuse', async () => {
    const idempotencyHarness = repositoryHarness();
    idempotencyHarness.tx.realExecutionReservation.findUnique.mockResolvedValue(
      row({ requestFingerprint: '0'.repeat(64) }),
    );
    await expect(
      idempotencyHarness.store.reserve(command()),
    ).rejects.toBeInstanceOf(RealExecutionReservationIdempotencyConflictError);

    const identityHarness = repositoryHarness();
    identityHarness.tx.realExecutionReservation.findFirst.mockResolvedValue({
      id: 'existing',
    });
    await expect(
      identityHarness.store.reserve(command()),
    ).rejects.toBeInstanceOf(RealExecutionReservationIdentityConflictError);
    expect(
      identityHarness.tx.realExecutionReservation.findMany,
    ).not.toHaveBeenCalled();
  });

  it('rolls back instead of persisting when durable totals diverge', async () => {
    const harness = repositoryHarness();
    await expect(
      harness.store.reserve(
        command({
          budgetSnapshot: {
            ...command().budgetSnapshot,
            reservedSpendUsdt: '1',
          },
        }),
      ),
    ).rejects.toMatchObject<RealExecutionReservationCapacityError>({
      blockers: ['reserved_budget_mismatch'],
    });
    expect(harness.tx.realExecutionReservation.create).not.toHaveBeenCalled();
  });

  it('re-evaluates quote expiry inside the serialized transaction', async () => {
    const harness = repositoryHarness(new Date('2026-10-01T14:00:06.000Z'));
    await expect(harness.store.reserve(command())).rejects.toMatchObject({
      blockers: ['reservation_plan_blocked'],
    });
    expect(harness.tx.realExecutionReservation.create).not.toHaveBeenCalled();
  });
});

function repositoryHarness(now = NOW) {
  const executeRaw = jest.fn<() => Promise<number>>().mockResolvedValue(1);
  const findUnique = jest
    .fn<() => Promise<ReservationRow | null>>()
    .mockResolvedValue(null);
  const findFirst = jest
    .fn<() => Promise<{ id: string } | null>>()
    .mockResolvedValue(null);
  const findMany = jest
    .fn<() => Promise<ReservationRow[]>>()
    .mockResolvedValue([]);
  const create =
    jest.fn<
      (args: { data: Record<string, unknown> }) => Promise<ReservationRow>
    >();
  const tx = {
    $executeRaw: executeRaw,
    realExecutionReservation: {
      findUnique,
      findFirst,
      findMany,
      create,
    },
  };
  const prismaTransaction = jest.fn(
    async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  );
  const prisma = {
    $transaction: prismaTransaction,
  } as unknown as PrismaService;
  return {
    tx,
    prisma,
    create,
    prismaTransaction,
    store: new PrismaRealExecutionReservationStore(prisma, () => now),
  };
}

function command(
  overrides: Partial<RealExecutionReservationCommand> = {},
): RealExecutionReservationCommand {
  const intent = {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'durable-reservation-1',
    kind: 'market_swap' as const,
    chainId: '56',
    sourceAsset: { tokenAddress: USDT_ADDRESS, symbol: 'USDT' },
    targetAsset: { tokenAddress: BTCB_ADDRESS, symbol: 'BTCB' },
    sourceQuantity: '5',
    maxSlippageRate: '0.001',
    createdAt: new Date('2026-10-01T13:59:59.000Z'),
  };
  return {
    intent,
    quote: {
      id: '22222222-2222-4222-8222-222222222222',
      providerId: 'agentic_wallet',
      providerQuoteId: null,
      intent,
      expectedTargetQuantity: '0.000062',
      minimumTargetQuantity: '0.000061938',
      costs: [
        {
          kind: 'provider_fee',
          asset: intent.sourceAsset,
          quantity: '0.005',
        },
        {
          kind: 'network_fee',
          asset: intent.sourceAsset,
          quantity: '0.1',
        },
      ],
      costCoverage: 'complete',
      quotedAt: new Date('2026-10-01T14:00:01.000Z'),
      expiresAt: new Date('2026-10-01T14:00:06.000Z'),
      executable: false,
    },
    limits: {
      maximumOrderNotionalUsdt: '8',
      maximumDailySpendUsdt: '20',
      maximumBankrollUsdt: '25',
      maximumProviderFeeRate: '0.01',
      maximumNetworkFeeUsdt: '0.5',
      maximumSlippageRate: '0.005',
    },
    budgetSnapshot: {
      providerId: 'agentic_wallet',
      chainId: '56',
      utcDay: '2026-10-01',
      settledSpendUsdt: '2',
      reservedSpendUsdt: '0',
      spendCoverage: 'complete',
      bankrollValueUsdt: '12',
      bankrollCoverage: 'complete',
      observedAt: new Date('2026-10-01T14:00:00.000Z'),
    },
    resourceSnapshot: {
      providerId: 'agentic_wallet',
      chainId: '56',
      intentId: intent.id,
      quoteId: '22222222-2222-4222-8222-222222222222',
      sourceTokenAddress: USDT_ADDRESS,
      sourceSymbol: 'USDT',
      sourceAvailableQuantity: '6',
      sourceBalanceCoverage: 'complete',
      nativeGasSymbol: 'BNB',
      nativeGasAvailableQuantity: '0.001',
      nativeGasRequiredQuantity: '0.0002',
      nativeGasCoverage: 'complete',
      observedAt: new Date('2026-10-01T14:00:00.000Z'),
    },
    quotaSnapshot: {
      providerId: 'agentic_wallet',
      chainId: '56',
      intentId: intent.id,
      quoteId: '22222222-2222-4222-8222-222222222222',
      utcDay: '2026-10-01',
      dailyLimitUsd: '1000',
      usedUsd: '100',
      remainingUsd: '900',
      quotaCoverage: 'complete',
      requiredUsd: '5.2',
      requirementValuationBasis: 'explicit_external_usd_value',
      requirementCoverage: 'complete',
      quotaObservedAt: new Date('2026-10-01T14:00:00.000Z'),
      requirementValuedAt: new Date('2026-10-01T14:00:01.000Z'),
    },
    freshness: {
      budgetSnapshotMaxAgeMs: 5000,
      resourceSnapshotMaxAgeMs: 5000,
      quotaSnapshotMaxAgeMs: 5000,
      requirementValuationMaxAgeMs: 5000,
      reservationSnapshotMaxAgeMs: 5000,
    },
    ...overrides,
  };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    idempotencyKey: 'durable-reservation-1',
    requestFingerprint: 'a'.repeat(64),
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest:
      'c13e8124d7ce1d3463b6eac3238bdc60e19aa50449dd433047f22456a11d92f6',
    utcDay: new Date('2026-10-01T00:00:00.000Z'),
    budgetChargeUsdt: '5.105',
    sourceTokenAddress: USDT_ADDRESS,
    sourceSymbol: 'USDT',
    sourceQuantity: '5.005',
    nativeGasSymbol: 'BNB',
    nativeGasQuantity: '0.0002',
    providerQuotaUsd: '5.2',
    expiresAt: new Date('2026-10-01T14:00:06.000Z'),
    createdAt: CREATED_AT,
    ...overrides,
  };
}

type ReservationRow = ReturnType<typeof row>;

function publicReservation() {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    idempotencyKey: 'durable-reservation-1',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest:
      'c13e8124d7ce1d3463b6eac3238bdc60e19aa50449dd433047f22456a11d92f6',
    utcDay: '2026-10-01',
    budgetChargeUsdt: '5.105',
    sourceTokenAddress: USDT_ADDRESS,
    sourceSymbol: 'USDT',
    sourceQuantity: '5.005',
    nativeGasSymbol: 'BNB',
    nativeGasQuantity: '0.0002',
    providerQuotaUsd: '5.2',
    expiresAt: new Date('2026-10-01T14:00:06.000Z'),
    createdAt: CREATED_AT,
  };
}
