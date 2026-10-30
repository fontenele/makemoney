import { jest } from '@jest/globals';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  RealExecutionReservationCapacityError,
  RealExecutionReservationCommand,
  RealExecutionReservationIdempotencyConflictError,
  RealExecutionReservationIdentityConflictError,
  RealExecutionReservationProvenanceError,
} from '../application/real-execution-reservation-store';
import { PrismaRealExecutionReservationStore } from './prisma-real-execution-reservation.store';

const NOW = new Date('2026-10-01T14:00:02.000Z');
const CREATED_AT = new Date('2026-10-01T14:00:02.100Z');
const USDT_ADDRESS = '0x55d398326f99059ff775485246999027b3197955';
const BTCB_ADDRESS = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';

describe('PrismaRealExecutionReservationStore', () => {
  it('blocks before creating financial capacity or a provider claim when cleanup is unresolved', async () => {
    const harness = repositoryHarness();
    harness.tx.$queryRaw
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'pending-cleanup' }]);
    await expect(harness.store.reserve(command())).rejects.toThrow(
      'unresolved approval cleanup',
    );
    expect(harness.create).not.toHaveBeenCalled();
  });
  it.each(['lock', 'capacity'] as const)(
    'isolates the complete command from caller mutation while awaiting %s',
    async (boundary) => {
      const harness = repositoryHarness();
      harness.create.mockImplementation(({ data }) =>
        Promise.resolve(row(data)),
      );
      const input = command({
        provenance: {
          accountingReconciliationId: '44444444-4444-4444-8444-444444444444',
          accountingReconciliationFingerprint: 'd'.repeat(64),
          providerObservedAt: new Date('2026-10-01T14:00:00.000Z'),
          requirementValuationBasis: 'explicit_external_usd_value',
          requirementValuedAt: new Date('2026-10-01T14:00:01.000Z'),
        },
      });
      const original = command({
        provenance: {
          ...input.provenance!,
          providerObservedAt: new Date(input.provenance!.providerObservedAt),
          requirementValuedAt: new Date(input.provenance!.requirementValuedAt),
        },
      });
      await harness.store.reserve(original);
      const expected = harness.create.mock.calls[0][0].data;
      harness.create.mockClear();

      let release!: () => void;
      let entered!: () => void;
      const waiting = new Promise<void>((resolve) => {
        entered = resolve;
      });
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      if (boundary === 'lock') {
        harness.tx.$executeRaw.mockImplementationOnce(async () => {
          entered();
          await gate;
          return 1;
        });
      } else {
        harness.tx.realExecutionReservation.findMany.mockImplementationOnce(
          async () => {
            entered();
            await gate;
            return [];
          },
        );
      }
      const pending = harness.store.reserve(input);
      await waiting;
      Object.assign(input.intent, {
        sourceQuantity: '999',
        idempotencyKey: 'altered',
      });
      Object.assign(input.intent.sourceAsset, { tokenAddress: BTCB_ADDRESS });
      Object.assign(input.quote.intent.targetAsset, { symbol: 'ALTERED' });
      Object.assign(input.quote.costs[0], { quantity: '999' });
      input.quote.expiresAt.setTime(0);
      input.intent.createdAt.setTime(0);
      Object.assign(input.limits, { maximumDailySpendUsdt: '0' });
      Object.assign(input.budgetSnapshot, { settledSpendUsdt: '999' });
      Object.assign(input.resourceSnapshot, { sourceAvailableQuantity: '0' });
      Object.assign(input.quotaSnapshot, { remainingUsd: '0' });
      input.quotaSnapshot.quotaObservedAt.setTime(0);
      Object.assign(input.freshness, { budgetSnapshotMaxAgeMs: 1 });
      Object.assign(input.provenance!, {
        accountingReconciliationFingerprint: 'e'.repeat(64),
      });
      input.provenance!.providerObservedAt.setTime(0);
      input.provenance!.requirementValuedAt.setTime(0);
      release();

      await expect(pending).resolves.toMatchObject({ replayed: false });
      expect(harness.create.mock.calls[0][0].data).toEqual(expected);
      harness.tx.realExecutionReservation.findUnique.mockResolvedValue(
        row(expected),
      );
      await expect(harness.store.reserve(original)).resolves.toMatchObject({
        replayed: true,
      });
    },
  );

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
    expect(harness.tx.$executeRaw).toHaveBeenCalledTimes(2);
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

  it('persists and returns complete authenticated provenance when supplied', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionReservation.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(row(data)),
    );
    const provenance = {
      accountingReconciliationId: '44444444-4444-4444-8444-444444444444',
      accountingReconciliationFingerprint: 'd'.repeat(64),
      providerObservedAt: new Date('2026-10-01T14:00:00.000Z'),
      requirementValuationBasis: 'explicit_external_usd_value' as const,
      requirementValuedAt: new Date('2026-10-01T14:00:01.000Z'),
    };

    await expect(
      harness.store.reserve(command({ provenance })),
    ).resolves.toMatchObject({
      reservation: { provenance },
      replayed: false,
    });
    expect(harness.create.mock.calls[0][0].data).toMatchObject({
      accountingReconciliationId: provenance.accountingReconciliationId,
      accountingReconciliationFingerprint:
        provenance.accountingReconciliationFingerprint,
      providerObservedAt: provenance.providerObservedAt,
      requirementValuationBasis: provenance.requirementValuationBasis,
      requirementValuedAt: provenance.requirementValuedAt,
    });
  });

  it('rejects malformed or quota-divergent provenance before persistence', async () => {
    const harness = repositoryHarness();
    const provenance = {
      accountingReconciliationId: '44444444-4444-4444-8444-444444444444',
      accountingReconciliationFingerprint: 'd'.repeat(64),
      providerObservedAt: new Date('2026-10-01T14:00:00.001Z'),
      requirementValuationBasis: 'explicit_external_usd_value' as const,
      requirementValuedAt: new Date('2026-10-01T14:00:01.000Z'),
    };

    await expect(
      harness.store.reserve(command({ provenance })),
    ).rejects.toBeInstanceOf(RealExecutionReservationProvenanceError);
    expect(harness.prismaTransaction).not.toHaveBeenCalled();
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
    $queryRaw: jest.fn<() => Promise<unknown[]>>().mockResolvedValue([]),
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
    accountingReconciliationId: null,
    accountingReconciliationFingerprint: null,
    providerObservedAt: null,
    requirementValuationBasis: null,
    requirementValuedAt: null,
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
    provenance: null,
    expiresAt: new Date('2026-10-01T14:00:06.000Z'),
    createdAt: CREATED_AT,
  };
}
