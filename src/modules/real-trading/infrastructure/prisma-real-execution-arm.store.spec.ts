import { jest } from '@jest/globals';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  RealExecutionArmCommand,
  RealExecutionArmIdempotencyConflictError,
  RealExecutionArmIdentityConflictError,
  RealExecutionArmPlanError,
  RealExecutionArmReservationNotFoundError,
} from '../application/real-execution-arm-store';
import { PrismaRealExecutionArmStore } from './prisma-real-execution-arm.store';

const NOW = new Date('2026-10-01T14:00:03.000Z');
const CREATED_AT = new Date('2026-10-01T14:00:03.100Z');

describe('PrismaRealExecutionArmStore', () => {
  it('re-evaluates and persists one immutable arm in a serialized transaction', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionArm.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(armRow(data)),
    );

    await expect(harness.store.arm(command())).resolves.toEqual({
      arm: publicArm(),
      replayed: false,
    });
    expect(harness.tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(harness.tx.realExecutionReservation.findUnique).toHaveBeenCalledWith(
      { where: { id: command().request.reservationId } },
    );
    expect(harness.create.mock.calls[0][0].data).toMatchObject({
      id: command().request.id,
      reservationId: command().request.reservationId,
      providerId: 'agentic_wallet',
      chainId: '56',
      payloadCommitmentVersion: 'real_execution_intent_quote_v1',
      payloadCommitmentDigest: 'a'.repeat(64),
      acknowledgment: 'reservation_and_quote_reviewed',
    });
    expect(harness.create.mock.calls[0][0].data.requestFingerprint).toMatch(
      /^[0-9a-f]{64}$/,
    );
    expect(harness.prismaTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('replays the exact arm after expiry without extending it', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionArm.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(armRow(data)),
    );
    await harness.store.arm(command());
    const stored = harness.create.mock.calls[0][0].data;
    harness.tx.realExecutionArm.findUnique.mockResolvedValue(armRow(stored));
    const laterStore = new PrismaRealExecutionArmStore(
      harness.prisma,
      () => new Date('2026-10-01T14:01:00.000Z'),
    );

    await expect(laterStore.arm(command())).resolves.toEqual({
      arm: publicArm(),
      replayed: true,
    });
    expect(harness.tx.realExecutionArm.create).toHaveBeenCalledTimes(1);
  });

  it('fails closed when replaying a legacy arm without a payload commitment', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionArm.create.mockImplementation(
      ({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(armRow(data)),
    );
    await harness.store.arm(command());
    const stored = harness.create.mock.calls[0][0].data;
    harness.tx.realExecutionArm.findUnique.mockResolvedValue(
      armRow({
        ...stored,
        payloadCommitmentVersion: null,
        payloadCommitmentDigest: null,
      }),
    );

    await expect(harness.store.arm(command())).rejects.toThrow(
      'Persisted real execution arm has invalid payload commitment',
    );
  });

  it('rejects conflicting arm ids and reservation identity reuse', async () => {
    const idHarness = repositoryHarness();
    idHarness.tx.realExecutionArm.findUnique.mockResolvedValue(
      armRow({ requestFingerprint: '0'.repeat(64) }),
    );
    await expect(idHarness.store.arm(command())).rejects.toBeInstanceOf(
      RealExecutionArmIdempotencyConflictError,
    );

    const identityHarness = repositoryHarness();
    identityHarness.tx.realExecutionArm.findFirst.mockResolvedValue({
      id: 'existing',
    });
    await expect(identityHarness.store.arm(command())).rejects.toBeInstanceOf(
      RealExecutionArmIdentityConflictError,
    );
    expect(identityHarness.tx.realExecutionArm.create).not.toHaveBeenCalled();
  });

  it('fails closed when the durable reservation does not exist', async () => {
    const harness = repositoryHarness();
    harness.tx.realExecutionReservation.findUnique.mockResolvedValue(null);

    await expect(harness.store.arm(command())).rejects.toBeInstanceOf(
      RealExecutionArmReservationNotFoundError,
    );
    expect(harness.tx.realExecutionArm.findFirst).not.toHaveBeenCalled();
  });

  it('rechecks reservation and arm expiry inside the transaction', async () => {
    const harness = repositoryHarness(new Date('2026-10-01T14:00:12.000Z'));

    let caught: unknown;
    try {
      await harness.store.arm(command());
    } catch (error: unknown) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(RealExecutionArmPlanError);
    if (!(caught instanceof RealExecutionArmPlanError)) throw caught;
    expect(caught.blockers).toEqual(
      expect.arrayContaining(['reservation_expired', 'arm_expired']),
    );
    expect(harness.tx.realExecutionArm.create).not.toHaveBeenCalled();
  });
});

function repositoryHarness(now = NOW) {
  const executeRaw = jest.fn<() => Promise<number>>().mockResolvedValue(1);
  const armFindUnique = jest
    .fn<() => Promise<ArmRow | null>>()
    .mockResolvedValue(null);
  const reservationFindUnique = jest
    .fn<() => Promise<ReservationRow | null>>()
    .mockResolvedValue(reservationRow());
  const findFirst = jest
    .fn<() => Promise<{ id: string } | null>>()
    .mockResolvedValue(null);
  const create =
    jest.fn<(args: { data: Record<string, unknown> }) => Promise<ArmRow>>();
  const tx = {
    $executeRaw: executeRaw,
    realExecutionArm: { findUnique: armFindUnique, findFirst, create },
    realExecutionReservation: { findUnique: reservationFindUnique },
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
    store: new PrismaRealExecutionArmStore(prisma, () => now),
  };
}

function command(): RealExecutionArmCommand {
  return {
    request: {
      id: '55555555-5555-4555-8555-555555555555',
      reservationId: '33333333-3333-4333-8333-333333333333',
      providerId: 'agentic_wallet',
      chainId: '56',
      intentId: '11111111-1111-4111-8111-111111111111',
      quoteId: '22222222-2222-4222-8222-222222222222',
      acknowledgment: 'reservation_and_quote_reviewed',
      requestedAt: new Date('2026-10-01T14:00:02.000Z'),
      expiresAt: new Date('2026-10-01T14:00:06.000Z'),
    },
    policy: { requestMaxAgeMs: 5_000, maximumArmLifetimeMs: 10_000 },
  };
}

function reservationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '33333333-3333-4333-8333-333333333333',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    idempotencyKey: 'durable-reservation-1',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'a'.repeat(64),
    utcDay: new Date('2026-10-01T00:00:00.000Z'),
    budgetChargeUsdt: '5.105',
    sourceTokenAddress: '0x55d398326f99059ff775485246999027b3197955',
    sourceSymbol: 'USDT',
    sourceQuantity: '5.005',
    nativeGasSymbol: 'BNB',
    nativeGasQuantity: '0.0002',
    providerQuotaUsd: '5.2',
    expiresAt: new Date('2026-10-01T14:00:12.000Z'),
    createdAt: new Date('2026-10-01T14:00:02.000Z'),
    ...overrides,
  };
}

function armRow(overrides: Record<string, unknown> = {}) {
  return {
    id: '55555555-5555-4555-8555-555555555555',
    reservationId: '33333333-3333-4333-8333-333333333333',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'a'.repeat(64),
    acknowledgment: 'reservation_and_quote_reviewed',
    requestFingerprint: 'a'.repeat(64),
    requestedAt: new Date('2026-10-01T14:00:02.000Z'),
    expiresAt: new Date('2026-10-01T14:00:06.000Z'),
    createdAt: CREATED_AT,
    ...overrides,
  };
}

type ReservationRow = ReturnType<typeof reservationRow>;
type ArmRow = ReturnType<typeof armRow>;

function publicArm() {
  const { request } = command();
  return {
    ...request,
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'a'.repeat(64),
    createdAt: CREATED_AT,
  };
}
