import 'dotenv/config';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { RealExecutionArmCommand } from '../src/modules/real-trading/application/real-execution-arm-store';
import { PrismaRealExecutionArmStore } from '../src/modules/real-trading/infrastructure/prisma-real-execution-arm.store';

const NOW = new Date('2026-10-01T14:00:03.000Z');

describe('Real execution arm persistence (e2e)', () => {
  let prisma: PrismaService;
  let store: PrismaRealExecutionArmStore;

  beforeAll(async () => {
    prisma = new PrismaService(
      process.env.DATABASE_URL ??
        'postgresql://crypto_trader:crypto_trader@localhost:5433/crypto_trader?schema=public',
    );
    await prisma.onModuleInit();
    store = new PrismaRealExecutionArmStore(prisma, () => NOW);
  });

  beforeEach(async () => {
    await prisma.realExecutionArm.deleteMany();
    await prisma.realExecutionReservation.deleteMany();
    await seedReservation();
  });

  afterAll(async () => {
    await prisma.realExecutionArm.deleteMany();
    await prisma.realExecutionReservation.deleteMany();
    await prisma.onModuleDestroy();
  });

  it('persists exact arm facts and replays them without extending expiry', async () => {
    const first = await store.arm(command(5));
    const replay = await new PrismaRealExecutionArmStore(
      prisma,
      () => new Date('2026-10-01T14:01:00.000Z'),
    ).arm(command(5));

    expect(first.replayed).toBe(false);
    expect(replay).toEqual({ arm: first.arm, replayed: true });
    await expect(prisma.realExecutionArm.count()).resolves.toBe(1);
    await expect(
      prisma.realExecutionArm.findUnique({ where: { id: first.arm.id } }),
    ).resolves.toMatchObject({
      reservationId: first.arm.reservationId,
      payloadCommitmentVersion: 'real_execution_intent_quote_v1',
      payloadCommitmentDigest: first.arm.payloadCommitmentDigest,
      acknowledgment: 'reservation_and_quote_reviewed',
      expiresAt: new Date('2026-10-01T14:00:06.000Z'),
    });
  });

  it('allows at most one concurrent arm for the same reservation', async () => {
    const results = await Promise.allSettled([
      store.arm(command(5)),
      store.arm(command(6)),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    await expect(prisma.realExecutionArm.count()).resolves.toBe(1);
  });

  async function seedReservation(): Promise<void> {
    await prisma.realExecutionReservation.create({
      data: {
        id: '33333333-3333-4333-8333-333333333333',
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: '11111111-1111-4111-8111-111111111111',
        quoteId: '22222222-2222-4222-8222-222222222222',
        idempotencyKey: 'durable-reservation-1',
        requestFingerprint: 'a'.repeat(64),
        payloadCommitmentVersion: 'real_execution_intent_quote_v1',
        payloadCommitmentDigest: 'c'.repeat(64),
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
      },
    });
  }
});

function command(seed: number): RealExecutionArmCommand {
  return {
    request: {
      id: uuid(seed),
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

function uuid(value: number): string {
  return `${value.toString(16).padStart(8, '0')}-0000-4000-8000-${value
    .toString(16)
    .padStart(12, '0')}`;
}
