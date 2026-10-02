import 'dotenv/config';

import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { RealExecutionFinalConfirmationCommand } from '../src/modules/real-trading/application/real-execution-final-confirmation-store';
import { PrismaRealExecutionFinalConfirmationStore } from '../src/modules/real-trading/infrastructure/prisma-real-execution-final-confirmation.store';

const NOW = new Date('2026-10-02T15:00:05.000Z');

describe('Real execution final confirmation persistence (e2e)', () => {
  let prisma: PrismaService;
  let store: PrismaRealExecutionFinalConfirmationStore;

  beforeAll(async () => {
    prisma = new PrismaService(process.env.DATABASE_URL!);
    await prisma.onModuleInit();
    store = new PrismaRealExecutionFinalConfirmationStore(prisma, () => NOW);
  });

  beforeEach(async () => {
    await prisma.realExecutionFinalConfirmation.deleteMany();
    await prisma.realExecutionRiskApproval.deleteMany();
    await prisma.realExecutionArm.deleteMany();
    await prisma.realExecutionReservation.deleteMany();
    await seedPrerequisites();
  });

  afterAll(async () => {
    await prisma.realExecutionFinalConfirmation.deleteMany();
    await prisma.realExecutionRiskApproval.deleteMany();
    await prisma.realExecutionArm.deleteMany();
    await prisma.realExecutionReservation.deleteMany();
    await prisma.onModuleDestroy();
  });

  it('persists one exact confirmation and replays it unchanged', async () => {
    const first = await store.confirm(command(8));
    const replay = await new PrismaRealExecutionFinalConfirmationStore(
      prisma,
      () => new Date('2026-10-02T15:01:00.000Z'),
    ).confirm(command(8));

    expect(first.replayed).toBe(false);
    expect(first.confirmation).toMatchObject({
      riskApproved: true,
      confirmationRecorded: true,
      emergencyStopRecheckedForSubmission: false,
      submissionAuthorized: false,
      emergencyStopChangeId: 'real-trading-stop-clear-1',
      expiresAt: new Date('2026-10-02T15:00:09.000Z'),
    });
    expect(replay).toEqual({
      confirmation: first.confirmation,
      replayed: true,
    });
    await expect(prisma.realExecutionFinalConfirmation.count()).resolves.toBe(
      1,
    );
  });

  it('allows at most one concurrent confirmation for the same approval', async () => {
    const results = await Promise.allSettled([
      store.confirm(command(8)),
      store.confirm(command(9)),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    await expect(prisma.realExecutionFinalConfirmation.count()).resolves.toBe(
      1,
    );
  });

  async function seedPrerequisites(): Promise<void> {
    await prisma.realExecutionReservation.create({
      data: {
        id: '33333333-3333-4333-8333-333333333333',
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: '11111111-1111-4111-8111-111111111111',
        quoteId: '22222222-2222-4222-8222-222222222222',
        idempotencyKey: 'final-confirmation-1',
        requestFingerprint: 'a'.repeat(64),
        payloadCommitmentVersion: 'real_execution_intent_quote_v1',
        payloadCommitmentDigest: 'c'.repeat(64),
        utcDay: new Date('2026-10-02T00:00:00.000Z'),
        budgetChargeUsdt: '5.105',
        sourceTokenAddress: '0x55d398326f99059ff775485246999027b3197955',
        sourceSymbol: 'USDT',
        sourceQuantity: '5.005',
        nativeGasSymbol: 'BNB',
        nativeGasQuantity: '0.0002',
        providerQuotaUsd: '5.2',
        expiresAt: new Date('2026-10-02T15:00:12.000Z'),
        createdAt: new Date('2026-10-02T15:00:01.000Z'),
      },
    });
    await prisma.realExecutionArm.create({
      data: {
        id: '55555555-5555-4555-8555-555555555555',
        reservationId: '33333333-3333-4333-8333-333333333333',
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: '11111111-1111-4111-8111-111111111111',
        quoteId: '22222222-2222-4222-8222-222222222222',
        payloadCommitmentVersion: 'real_execution_intent_quote_v1',
        payloadCommitmentDigest: 'c'.repeat(64),
        acknowledgment: 'reservation_and_quote_reviewed',
        requestFingerprint: 'b'.repeat(64),
        requestedAt: new Date('2026-10-02T15:00:01.500Z'),
        expiresAt: new Date('2026-10-02T15:00:11.000Z'),
        createdAt: new Date('2026-10-02T15:00:02.000Z'),
      },
    });
    await prisma.realExecutionRiskApproval.create({
      data: {
        id: '77777777-7777-4777-8777-777777777777',
        reservationId: '33333333-3333-4333-8333-333333333333',
        armId: '55555555-5555-4555-8555-555555555555',
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: '11111111-1111-4111-8111-111111111111',
        quoteId: '22222222-2222-4222-8222-222222222222',
        emergencyStopChangeId: 'real-trading-stop-clear-1',
        requestFingerprint: 'c'.repeat(64),
        revalidatedAt: new Date('2026-10-02T15:00:02.500Z'),
        expiresAt: new Date('2026-10-02T15:00:10.000Z'),
        createdAt: new Date('2026-10-02T15:00:03.000Z'),
      },
    });
  }
});

function command(seed: number): RealExecutionFinalConfirmationCommand {
  return {
    request: {
      id: uuid(seed),
      approvalId: '77777777-7777-4777-8777-777777777777',
      reservationId: '33333333-3333-4333-8333-333333333333',
      armId: '55555555-5555-4555-8555-555555555555',
      providerId: 'agentic_wallet',
      chainId: '56',
      intentId: '11111111-1111-4111-8111-111111111111',
      quoteId: '22222222-2222-4222-8222-222222222222',
      emergencyStopChangeId: 'real-trading-stop-clear-1',
      acknowledgment:
        'risk_approval_and_final_quote_reviewed_for_immediate_submission',
      requestedAt: new Date('2026-10-02T15:00:04.000Z'),
      expiresAt: new Date('2026-10-02T15:00:09.000Z'),
    },
    policy: {
      requestMaxAgeMs: 5_000,
      maximumConfirmationLifetimeMs: 10_000,
    },
  };
}

function uuid(value: number): string {
  return `${value.toString(16).padStart(8, '0')}-0000-4000-8000-${value
    .toString(16)
    .padStart(12, '0')}`;
}
