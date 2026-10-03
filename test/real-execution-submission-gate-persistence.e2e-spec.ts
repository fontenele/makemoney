import 'dotenv/config';

import { PrismaService } from '../src/infrastructure/database/prisma.service';
import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../src/modules/real-trading/domain/real-execution';
import { assessRealExecutionPayloadCommitment } from '../src/modules/real-trading/application/real-execution-payload-commitment';
import {
  RealExecutionSubmissionGateBlockedError,
  RealExecutionSubmissionGateCommand,
} from '../src/modules/real-trading/application/real-execution-submission-gate-store';
import { PrismaRealExecutionSubmissionGateStore } from '../src/modules/real-trading/infrastructure/prisma-real-execution-submission-gate.store';

const NOW = new Date('2026-10-03T12:00:04.000Z');

describe('Real execution submission gate persistence (e2e)', () => {
  let prisma: PrismaService;
  let store: PrismaRealExecutionSubmissionGateStore;

  beforeAll(async () => {
    prisma = new PrismaService(process.env.DATABASE_URL!);
    await prisma.onModuleInit();
    store = new PrismaRealExecutionSubmissionGateStore(prisma, () => NOW);
  });

  beforeEach(async () => {
    await cleanup();
    await seedPrerequisites();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.onModuleDestroy();
  });

  it('persists one inert atomic gate and replays it unchanged', async () => {
    const first = await store.create(command(10));
    const replay = await new PrismaRealExecutionSubmissionGateStore(
      prisma,
      () => new Date('2026-10-03T12:01:00.000Z'),
    ).create(command(10));

    expect(first).toMatchObject({
      replayed: false,
      gate: {
        id: uuid(10),
        status: 'prepared_not_submitted',
        payloadCommitmentDigest: commitmentDigest(),
        emergencyStopRecheckedAt: NOW,
        confirmationConsumedAt: NOW,
        atomicGateSatisfied: true,
        confirmationConsumed: true,
        providerSubmissionStarted: false,
        submissionAuthorized: false,
      },
    });
    expect(replay).toEqual({ gate: first.gate, replayed: true });
    await expect(prisma.realExecutionSubmissionGate.count()).resolves.toBe(1);
  });

  it('allows only one concurrent gate to consume a confirmation', async () => {
    const results = await Promise.allSettled([
      store.create(command(10)),
      store.create(command(11)),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    await expect(prisma.realExecutionSubmissionGate.count()).resolves.toBe(1);
  });

  it('blocks when the latest serialized emergency-stop state is active', async () => {
    await prisma.riskControlEvent.create({
      data: {
        id: 'real-trading-stop-active-2',
        control: 'emergency_stop',
        active: true,
        reason: 'test stop',
        changedAt: new Date('2026-10-03T12:00:03.000Z'),
      },
    });

    await expect(store.create(command(10))).rejects.toBeInstanceOf(
      RealExecutionSubmissionGateBlockedError,
    );
    await expect(prisma.realExecutionSubmissionGate.count()).resolves.toBe(0);
  });

  async function cleanup(): Promise<void> {
    await prisma.realExecutionSubmissionGate.deleteMany();
    await prisma.realExecutionFinalConfirmation.deleteMany();
    await prisma.realExecutionRiskApproval.deleteMany();
    await prisma.realExecutionArm.deleteMany();
    await prisma.realExecutionReservation.deleteMany();
    await prisma.riskControlEvent.deleteMany({
      where: { control: 'emergency_stop' },
    });
  }

  async function seedPrerequisites(): Promise<void> {
    const digest = commitmentDigest();
    await prisma.realExecutionReservation.create({
      data: {
        id: '33333333-3333-4333-8333-333333333333',
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: intent().id,
        quoteId: quote().id,
        idempotencyKey: 'submission-gate-e2e-1',
        requestFingerprint: 'a'.repeat(64),
        payloadCommitmentVersion: 'real_execution_intent_quote_v1',
        payloadCommitmentDigest: digest,
        utcDay: new Date('2026-10-03T00:00:00.000Z'),
        budgetChargeUsdt: '5.105',
        sourceTokenAddress: intent().sourceAsset.tokenAddress,
        sourceSymbol: 'USDT',
        sourceQuantity: '5.005',
        nativeGasSymbol: 'BNB',
        nativeGasQuantity: '0.0002',
        providerQuotaUsd: '5.2',
        expiresAt: new Date('2026-10-03T12:00:12.000Z'),
        createdAt: new Date('2026-10-03T12:00:00.500Z'),
      },
    });
    await prisma.realExecutionArm.create({
      data: {
        id: '55555555-5555-4555-8555-555555555555',
        reservationId: '33333333-3333-4333-8333-333333333333',
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: intent().id,
        quoteId: quote().id,
        payloadCommitmentVersion: 'real_execution_intent_quote_v1',
        payloadCommitmentDigest: digest,
        acknowledgment: 'reservation_and_quote_reviewed',
        requestFingerprint: 'b'.repeat(64),
        requestedAt: new Date('2026-10-03T12:00:00.750Z'),
        expiresAt: new Date('2026-10-03T12:00:11.000Z'),
        createdAt: new Date('2026-10-03T12:00:01.000Z'),
      },
    });
    await prisma.realExecutionRiskApproval.create({
      data: {
        id: '77777777-7777-4777-8777-777777777777',
        reservationId: '33333333-3333-4333-8333-333333333333',
        armId: '55555555-5555-4555-8555-555555555555',
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: intent().id,
        quoteId: quote().id,
        payloadCommitmentVersion: 'real_execution_intent_quote_v1',
        payloadCommitmentDigest: digest,
        emergencyStopChangeId: 'real-trading-stop-clear-1',
        requestFingerprint: 'c'.repeat(64),
        revalidatedAt: new Date('2026-10-03T12:00:01.250Z'),
        expiresAt: new Date('2026-10-03T12:00:10.000Z'),
        createdAt: new Date('2026-10-03T12:00:01.500Z'),
      },
    });
    await prisma.realExecutionFinalConfirmation.create({
      data: {
        id: '88888888-8888-4888-8888-888888888888',
        approvalId: '77777777-7777-4777-8777-777777777777',
        reservationId: '33333333-3333-4333-8333-333333333333',
        armId: '55555555-5555-4555-8555-555555555555',
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: intent().id,
        quoteId: quote().id,
        payloadCommitmentVersion: 'real_execution_intent_quote_v1',
        payloadCommitmentDigest: digest,
        emergencyStopChangeId: 'real-trading-stop-clear-1',
        acknowledgment:
          'risk_approval_and_final_quote_reviewed_for_immediate_submission',
        requestFingerprint: 'd'.repeat(64),
        requestedAt: new Date('2026-10-03T12:00:01.750Z'),
        expiresAt: new Date('2026-10-03T12:00:08.000Z'),
        createdAt: new Date('2026-10-03T12:00:02.000Z'),
      },
    });
    await prisma.riskControlEvent.create({
      data: {
        id: 'real-trading-stop-clear-1',
        control: 'emergency_stop',
        active: false,
        reason: 'test clear',
        changedAt: new Date('2026-10-03T12:00:01.000Z'),
      },
    });
  }
});

function command(seed: number): RealExecutionSubmissionGateCommand {
  return {
    id: uuid(seed),
    submissionPlan: {
      id: '99999999-9999-4999-8999-999999999999',
      confirmationId: '88888888-8888-4888-8888-888888888888',
      approvalId: '77777777-7777-4777-8777-777777777777',
      reservationId: '33333333-3333-4333-8333-333333333333',
      armId: '55555555-5555-4555-8555-555555555555',
      providerId: 'agentic_wallet',
      chainId: '56',
      intentId: intent().id,
      quoteId: quote().id,
      emergencyStopChangeId: 'real-trading-stop-clear-1',
      requestedAt: new Date('2026-10-03T12:00:03.000Z'),
      expiresAt: new Date('2026-10-03T12:00:07.000Z'),
      initialSubmissionOnly: true,
      automaticRetryAllowed: false,
    },
    intent: intent(),
    quote: quote(),
    emergencyStopPolicy: { snapshotMaxAgeMs: 1_000 },
  };
}

function intent(): RealExecutionIntent {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'submission-gate-e2e-1',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: {
      tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
      symbol: 'USDT',
    },
    targetAsset: {
      tokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
      symbol: 'BTCB',
    },
    sourceQuantity: '5',
    maxSlippageRate: '0.001',
    createdAt: new Date('2026-10-03T12:00:00.000Z'),
  };
}

function quote(): RealExecutionQuote {
  return {
    id: '22222222-2222-4222-8222-222222222222',
    providerId: 'agentic_wallet',
    providerQuoteId: null,
    intent: intent(),
    expectedTargetQuantity: '0.000062',
    minimumTargetQuantity: '0.000061938',
    costs: [
      { kind: 'provider_fee', asset: intent().sourceAsset, quantity: '0.005' },
      { kind: 'network_fee', asset: intent().sourceAsset, quantity: '0.1' },
    ],
    costCoverage: 'complete',
    quotedAt: new Date('2026-10-03T12:00:00.250Z'),
    expiresAt: new Date('2026-10-03T12:00:08.000Z'),
    executable: false,
  };
}

function commitmentDigest(): string {
  const assessment = assessRealExecutionPayloadCommitment(
    intent(),
    quote(),
    NOW,
  );
  if (assessment.commitment === null)
    throw new Error('test commitment blocked');
  return assessment.commitment.digest;
}

function uuid(value: number): string {
  return `${value.toString(16).padStart(8, '0')}-0000-4000-8000-${value
    .toString(16)
    .padStart(12, '0')}`;
}
