import 'dotenv/config';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { RealExecutionReservationCommand } from '../src/modules/real-trading/application/real-execution-reservation-store';
import { PrismaRealExecutionReservationStore } from '../src/modules/real-trading/infrastructure/prisma-real-execution-reservation.store';

const NOW = new Date('2026-10-01T14:00:02.000Z');
const USDT_ADDRESS = '0x55d398326f99059ff775485246999027b3197955';
const BTCB_ADDRESS = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';

describe('Real execution reservation persistence (e2e)', () => {
  let prisma: PrismaService;
  let store: PrismaRealExecutionReservationStore;

  beforeAll(async () => {
    prisma = new PrismaService(
      process.env.DATABASE_URL ??
        'postgresql://crypto_trader:crypto_trader@localhost:5433/crypto_trader?schema=public',
    );
    await prisma.onModuleInit();
    store = new PrismaRealExecutionReservationStore(prisma, () => NOW);
  });

  beforeEach(() => prisma.realExecutionReservation.deleteMany());
  afterAll(async () => {
    await prisma.realExecutionReservation.deleteMany();
    await prisma.onModuleDestroy();
  });

  it('persists exact facts and replays one immutable idempotency request', async () => {
    const first = await store.reserve(command(1));
    const replay = await new PrismaRealExecutionReservationStore(
      prisma,
      () => new Date('2026-10-01T14:01:00.000Z'),
    ).reserve(command(1));

    expect(first.replayed).toBe(false);
    expect(replay).toEqual({ reservation: first.reservation, replayed: true });
    await expect(prisma.realExecutionReservation.count()).resolves.toBe(1);
    await expect(
      prisma.realExecutionReservation.findUnique({
        where: { id: first.reservation.id },
      }),
    ).resolves.toMatchObject({
      budgetChargeUsdt: '5.105',
      sourceQuantity: '5.005',
      nativeGasQuantity: '0.0002',
      providerQuotaUsd: '5.2',
    });
  });

  it('allows at most one concurrent request to consume the same zero-reservation snapshot', async () => {
    const results = await Promise.allSettled([
      store.reserve(command(1)),
      store.reserve(command(4)),
    ]);

    expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(
      1,
    );
    expect(results.filter(({ status }) => status === 'rejected')).toHaveLength(
      1,
    );
    await expect(prisma.realExecutionReservation.count()).resolves.toBe(1);
  });
});

function command(seed: number): RealExecutionReservationCommand {
  const intentId = uuid(seed);
  const quoteId = uuid(seed + 1);
  const intent = {
    id: intentId,
    idempotencyKey: `e2e-durable-reservation-${seed}`,
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
      id: quoteId,
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
      intentId,
      quoteId,
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
      intentId,
      quoteId,
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
  };
}

function uuid(value: number): string {
  return `${value.toString(16).padStart(8, '0')}-0000-4000-8000-${value
    .toString(16)
    .padStart(12, '0')}`;
}
