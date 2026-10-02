import 'dotenv/config';

import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { RealExecutionRiskApprovalCommand } from '../src/modules/real-trading/application/real-execution-risk-approval-store';
import { PrismaRealExecutionRiskApprovalStore } from '../src/modules/real-trading/infrastructure/prisma-real-execution-risk-approval.store';

const NOW = new Date('2026-10-02T14:00:05.000Z');
const USDT = {
  tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
  symbol: 'USDT',
};
const BTCB = {
  tokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
  symbol: 'BTCB',
};

describe('Real execution risk approval persistence (e2e)', () => {
  let prisma: PrismaService;
  let store: PrismaRealExecutionRiskApprovalStore;

  beforeAll(async () => {
    prisma = new PrismaService(
      process.env.DATABASE_URL ??
        'postgresql://crypto_trader:crypto_trader@localhost:5433/crypto_trader?schema=public',
    );
    await prisma.onModuleInit();
    store = new PrismaRealExecutionRiskApprovalStore(prisma, () => NOW);
  });

  beforeEach(async () => {
    await prisma.realExecutionRiskApproval.deleteMany();
    await prisma.realExecutionArm.deleteMany();
    await prisma.realExecutionReservation.deleteMany();
    await prisma.riskControlEvent.deleteMany();
    await seedPrerequisites();
  });

  afterAll(async () => {
    await prisma.realExecutionRiskApproval.deleteMany();
    await prisma.realExecutionArm.deleteMany();
    await prisma.realExecutionReservation.deleteMany();
    await prisma.riskControlEvent.deleteMany();
    await prisma.onModuleDestroy();
  });

  it('persists an exact short-lived approval and replays it unchanged', async () => {
    const first = await store.approve(command(7));
    const replay = await new PrismaRealExecutionRiskApprovalStore(
      prisma,
      () => new Date('2026-10-02T14:01:00.000Z'),
    ).approve(command(7));

    expect(first.replayed).toBe(false);
    expect(first.approval).toMatchObject({
      riskApproved: true,
      confirmationRecorded: false,
      submissionAuthorized: false,
      emergencyStopChangeId: 'real-trading-stop-clear-1',
      expiresAt: new Date('2026-10-02T14:00:07.000Z'),
    });
    expect(replay).toEqual({ approval: first.approval, replayed: true });
    await expect(prisma.realExecutionRiskApproval.count()).resolves.toBe(1);
  });

  it('allows at most one concurrent approval for the same arm', async () => {
    const results = await Promise.allSettled([
      store.approve(command(7)),
      store.approve(command(8)),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    await expect(prisma.realExecutionRiskApproval.count()).resolves.toBe(1);
  });

  async function seedPrerequisites(): Promise<void> {
    await prisma.realExecutionReservation.create({
      data: {
        id: '33333333-3333-4333-8333-333333333333',
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: '11111111-1111-4111-8111-111111111111',
        quoteId: '22222222-2222-4222-8222-222222222222',
        idempotencyKey: 'risk-approval-1',
        requestFingerprint: 'a'.repeat(64),
        payloadCommitmentVersion: 'real_execution_intent_quote_v1',
        payloadCommitmentDigest: 'c'.repeat(64),
        utcDay: new Date('2026-10-02T00:00:00.000Z'),
        budgetChargeUsdt: '5.105',
        sourceTokenAddress: USDT.tokenAddress,
        sourceSymbol: 'USDT',
        sourceQuantity: '5.005',
        nativeGasSymbol: 'BNB',
        nativeGasQuantity: '0.0002',
        providerQuotaUsd: '5.2',
        expiresAt: new Date('2026-10-02T14:00:08.000Z'),
        createdAt: new Date('2026-10-02T14:00:02.000Z'),
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
        acknowledgment: 'reservation_and_quote_reviewed',
        requestFingerprint: 'b'.repeat(64),
        requestedAt: new Date('2026-10-02T14:00:03.000Z'),
        expiresAt: new Date('2026-10-02T14:00:07.000Z'),
        createdAt: new Date('2026-10-02T14:00:04.000Z'),
      },
    });
    await prisma.riskControlEvent.create({
      data: {
        id: 'real-trading-stop-clear-1',
        control: 'emergency_stop',
        active: false,
        reason: 'operator cleared before arming',
        changedAt: new Date('2026-10-02T13:59:00.000Z'),
      },
    });
  }
});

function command(seed: number): RealExecutionRiskApprovalCommand {
  const intent = {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'risk-approval-1',
    kind: 'market_swap' as const,
    chainId: '56',
    sourceAsset: USDT,
    targetAsset: BTCB,
    sourceQuantity: '5',
    maxSlippageRate: '0.001',
    createdAt: new Date('2026-10-02T13:59:59.000Z'),
  };
  const quoteId = '22222222-2222-4222-8222-222222222222';
  return {
    request: {
      id: uuid(seed),
      reservationId: '33333333-3333-4333-8333-333333333333',
      armId: '55555555-5555-4555-8555-555555555555',
    },
    intent,
    quote: {
      id: quoteId,
      providerId: 'agentic_wallet',
      providerQuoteId: null,
      intent,
      expectedTargetQuantity: '0.000062',
      minimumTargetQuantity: '0.000061938',
      costs: [
        { kind: 'provider_fee', asset: USDT, quantity: '0.005' },
        { kind: 'network_fee', asset: USDT, quantity: '0.1' },
      ],
      costCoverage: 'complete',
      quotedAt: new Date('2026-10-02T14:00:01.000Z'),
      expiresAt: new Date('2026-10-02T14:00:08.000Z'),
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
      utcDay: '2026-10-02',
      settledSpendUsdt: '2',
      reservedSpendUsdt: '5.105',
      spendCoverage: 'complete',
      bankrollValueUsdt: '12',
      bankrollCoverage: 'complete',
      observedAt: new Date('2026-10-02T14:00:04.000Z'),
    },
    resourceSnapshot: {
      providerId: 'agentic_wallet',
      chainId: '56',
      intentId: intent.id,
      quoteId,
      sourceTokenAddress: USDT.tokenAddress,
      sourceSymbol: 'USDT',
      sourceAvailableQuantity: '6',
      sourceBalanceCoverage: 'complete',
      nativeGasSymbol: 'BNB',
      nativeGasAvailableQuantity: '0.001',
      nativeGasRequiredQuantity: '0.0002',
      nativeGasCoverage: 'complete',
      observedAt: new Date('2026-10-02T14:00:04.000Z'),
    },
    quotaSnapshot: {
      providerId: 'agentic_wallet',
      chainId: '56',
      intentId: intent.id,
      quoteId,
      utcDay: '2026-10-02',
      dailyLimitUsd: '1000',
      usedUsd: '100',
      remainingUsd: '900',
      quotaCoverage: 'complete',
      requiredUsd: '5.2',
      requirementValuationBasis: 'explicit_external_usd_value',
      requirementCoverage: 'complete',
      quotaObservedAt: new Date('2026-10-02T14:00:04.000Z'),
      requirementValuedAt: new Date('2026-10-02T14:00:04.000Z'),
    },
    policy: {
      budgetSnapshotMaxAgeMs: 5_000,
      resourceSnapshotMaxAgeMs: 5_000,
      quotaSnapshotMaxAgeMs: 5_000,
      requirementValuationMaxAgeMs: 5_000,
      reservationSnapshotMaxAgeMs: 5_000,
      emergencyStopSnapshotMaxAgeMs: 5_000,
    },
  };
}

function uuid(value: number): string {
  return `${value.toString(16).padStart(8, '0')}-0000-4000-8000-${value
    .toString(16)
    .padStart(12, '0')}`;
}
