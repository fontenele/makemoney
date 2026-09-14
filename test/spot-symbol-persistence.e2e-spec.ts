import 'dotenv/config';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { PrismaSpotSymbolRepository } from '../src/modules/new-listings/infrastructure/prisma-spot-symbol.repository';

describe('Spot symbol observation persistence (e2e)', () => {
  let prisma: PrismaService;
  let repository: PrismaSpotSymbolRepository;

  beforeAll(async () => {
    prisma = new PrismaService(process.env.DATABASE_URL!);
    await prisma.onModuleInit();
    repository = new PrismaSpotSymbolRepository(prisma);
  });

  afterAll(async () => prisma.onModuleDestroy());

  beforeEach(async () => {
    await prisma.listingObservationCheckpoint.deleteMany();
    await prisma.observedSpotSymbol.deleteMany();
  });

  it('preserves first observation and updates current state', async () => {
    const first = new Date('2026-09-14T01:00:00.000Z');
    const second = new Date('2026-09-14T02:00:00.000Z');
    await expect(
      repository.observe({
        receivedAt: first,
        symbols: [symbol('TRADING', true)],
      }),
    ).resolves.toEqual([]);
    await expect(
      repository.observe({
        receivedAt: second,
        symbols: [symbol('BREAK', false)],
      }),
    ).resolves.toEqual([]);

    await expect(
      prisma.observedSpotSymbol.findUnique({
        where: { provider_symbol: { provider: 'binance', symbol: 'TESTUSDT' } },
      }),
    ).resolves.toMatchObject({
      firstObservedAt: first,
      lastObservedAt: second,
      status: 'BREAK',
      spotTradingAllowed: false,
      detectedAt: null,
    });
  });

  it('detects only symbols absent from an established baseline', async () => {
    const first = new Date('2026-09-14T01:00:00.000Z');
    const second = new Date('2026-09-14T02:00:00.000Z');
    await expect(
      repository.observe({
        receivedAt: first,
        symbols: [symbol('TRADING', true)],
      }),
    ).resolves.toEqual([]);

    const added = {
      ...symbol('TRADING', true),
      symbol: 'NEWUSDT',
      baseAsset: 'NEW',
    };
    await expect(
      repository.observe({
        receivedAt: second,
        symbols: [symbol('TRADING', true), added],
      }),
    ).resolves.toEqual([added]);

    await expect(
      prisma.observedSpotSymbol.findUnique({
        where: { provider_symbol: { provider: 'binance', symbol: 'NEWUSDT' } },
      }),
    ).resolves.toMatchObject({
      firstObservedAt: second,
      detectedAt: second,
    });
    const checkpoints = await prisma.listingObservationCheckpoint.findMany({
      where: { provider: 'binance', symbol: 'NEWUSDT' },
      orderBy: { targetAt: 'asc' },
    });
    expect(checkpoints).toHaveLength(9);
    expect(checkpoints[0]).toMatchObject({
      label: 'T+0',
      offsetMs: 0,
      targetAt: second,
    });
    expect(checkpoints[8]).toMatchObject({
      label: 'T+24h',
      offsetMs: 86_400_000,
      targetAt: new Date('2026-09-15T02:00:00.000Z'),
    });
    await expect(
      repository.listDueCheckpoints(new Date('2026-09-14T02:00:10.000Z'), 2),
    ).resolves.toMatchObject([
      { symbol: 'NEWUSDT', label: 'T+0' },
      { symbol: 'NEWUSDT', label: 'T+5s' },
    ]);

    const third = new Date('2026-09-14T03:00:00.000Z');
    await repository.observe({ receivedAt: third, symbols: [added] });
    await expect(
      prisma.observedSpotSymbol.findUnique({
        where: { provider_symbol: { provider: 'binance', symbol: 'NEWUSDT' } },
      }),
    ).resolves.toMatchObject({
      firstObservedAt: second,
      lastObservedAt: third,
      detectedAt: second,
    });

    await expect(
      repository.listDetected({
        limit: 10,
        detectedFrom: second,
        detectedTo: second,
      }),
    ).resolves.toEqual([
      {
        ...added,
        detectedAt: second,
        lastObservedAt: third,
      },
    ]);
    await expect(
      repository.listDetected({
        limit: 10,
        detectedFrom: new Date(second.getTime() + 1),
      }),
    ).resolves.toEqual([]);
  });

  it('paginates detections after the stable provider and symbol cursor', async () => {
    const newest = new Date('2026-09-14T03:00:00.000Z');
    const tied = new Date('2026-09-14T02:00:00.000Z');
    await prisma.observedSpotSymbol.createMany({
      data: [
        detectedRow('NEWESTUSDT', newest),
        detectedRow('ALPHAUSDT', tied),
        {
          ...detectedRow('BETAUSDT', tied),
          status: 'BREAK',
          spotTradingAllowed: false,
        },
      ],
    });

    const firstPage = await repository.listDetected({ limit: 2 });
    expect(firstPage.map(({ symbol }) => symbol)).toEqual([
      'NEWESTUSDT',
      'ALPHAUSDT',
    ]);
    const cursor = await repository.findDetected('binance', 'ALPHAUSDT');
    if (!cursor) throw new Error('Expected detected cursor');
    await expect(
      repository.listDetected({ limit: 2, cursor }),
    ).resolves.toMatchObject([{ symbol: 'BETAUSDT' }]);
    await expect(
      repository.listDetected({
        limit: 10,
        provider: 'binance',
        status: 'TRADING',
        spotTradingAllowed: true,
      }),
    ).resolves.toMatchObject([
      { symbol: 'NEWESTUSDT' },
      { symbol: 'ALPHAUSDT' },
    ]);
    await expect(
      repository.listDetected({
        limit: 10,
        status: 'BREAK',
        spotTradingAllowed: false,
      }),
    ).resolves.toMatchObject([{ symbol: 'BETAUSDT' }]);
    await expect(repository.summarizeDetected({})).resolves.toEqual({
      count: 3,
      firstDetectedAt: tied,
      lastDetectedAt: newest,
      byStatus: [
        { status: 'BREAK', count: 1 },
        { status: 'TRADING', count: 2 },
      ],
      bySpotTradingAllowed: [
        { spotTradingAllowed: false, count: 1 },
        { spotTradingAllowed: true, count: 2 },
      ],
    });
    await expect(
      repository.summarizeDetected({
        detectedFrom: tied,
        detectedTo: tied,
        provider: 'binance',
        status: 'TRADING',
        spotTradingAllowed: true,
      }),
    ).resolves.toEqual({
      count: 1,
      firstDetectedAt: tied,
      lastDetectedAt: tied,
      byStatus: [{ status: 'TRADING', count: 1 }],
      bySpotTradingAllowed: [{ spotTradingAllowed: true, count: 1 }],
    });
  });

  it('returns an explicit empty detection summary', async () => {
    await expect(repository.summarizeDetected({})).resolves.toEqual({
      count: 0,
      firstDetectedAt: null,
      lastDetectedAt: null,
      byStatus: [],
      bySpotTradingAllowed: [],
    });
  });

  it('claims due checkpoints atomically and reclaims expired leases', async () => {
    const detectedAt = new Date('2026-09-14T02:00:00.000Z');
    await prisma.observedSpotSymbol.create({
      data: detectedRow('LEASEUSDT', detectedAt),
    });
    await prisma.listingObservationCheckpoint.createMany({
      data: [
        {
          provider: 'binance',
          symbol: 'LEASEUSDT',
          label: 'T+0',
          offsetMs: 0,
          targetAt: detectedAt,
        },
        {
          provider: 'binance',
          symbol: 'LEASEUSDT',
          label: 'T+5s',
          offsetMs: 5_000,
          targetAt: new Date(detectedAt.getTime() + 5_000),
        },
        {
          provider: 'binance',
          symbol: 'LEASEUSDT',
          label: 'T+10s',
          offsetMs: 10_000,
          targetAt: new Date(detectedAt.getTime() + 10_000),
        },
      ],
    });
    const claimedAt = new Date('2026-09-14T02:01:00.000Z');
    const expiry = new Date('2026-09-14T02:01:30.000Z');

    const first = await repository.claimDueCheckpoints({
      dueAt: claimedAt,
      limit: 2,
      claimToken: 'worker-a',
      claimedAt,
      claimExpiresAt: expiry,
    });
    expect(first.map(({ label }) => label)).toEqual(['T+0', 'T+5s']);
    expect(first).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          claimToken: 'worker-a',
          claimedAt,
          claimExpiresAt: expiry,
        }),
      ]),
    );

    await expect(
      repository.claimDueCheckpoints({
        dueAt: claimedAt,
        limit: 2,
        claimToken: 'worker-b',
        claimedAt,
        claimExpiresAt: expiry,
      }),
    ).resolves.toMatchObject([{ label: 'T+10s', claimToken: 'worker-b' }]);

    const reclaimedAt = new Date(expiry.getTime() + 1);
    const reclaimed = await repository.claimDueCheckpoints({
      dueAt: reclaimedAt,
      limit: 2,
      claimToken: 'worker-c',
      claimedAt: reclaimedAt,
      claimExpiresAt: new Date(reclaimedAt.getTime() + 30_000),
    });
    expect(reclaimed.map(({ label }) => label)).toEqual(['T+0', 'T+5s']);
    expect(reclaimed.every(({ claimToken }) => claimToken === 'worker-c')).toBe(
      true,
    );

    const completedAt = new Date(reclaimedAt.getTime() + 1_000);
    await expect(
      repository.completeClaimedCheckpoint({
        provider: 'binance',
        symbol: 'LEASEUSDT',
        label: 'T+0',
        claimToken: 'wrong-worker',
        completedAt,
      }),
    ).resolves.toBe(false);
    await expect(
      repository.completeClaimedCheckpoint({
        provider: 'binance',
        symbol: 'LEASEUSDT',
        label: 'T+0',
        claimToken: 'worker-c',
        completedAt,
      }),
    ).resolves.toBe(true);
    await expect(
      repository.completeClaimedCheckpoint({
        provider: 'binance',
        symbol: 'LEASEUSDT',
        label: 'T+0',
        claimToken: 'worker-c',
        completedAt,
      }),
    ).resolves.toBe(false);

    const afterAllLeasesExpire = new Date(reclaimedAt.getTime() + 31_000);
    await expect(
      repository.completeClaimedCheckpoint({
        provider: 'binance',
        symbol: 'LEASEUSDT',
        label: 'T+10s',
        claimToken: 'worker-b',
        completedAt: afterAllLeasesExpire,
      }),
    ).resolves.toBe(false);
    const available = await repository.claimDueCheckpoints({
      dueAt: afterAllLeasesExpire,
      limit: 10,
      claimToken: 'worker-d',
      claimedAt: afterAllLeasesExpire,
      claimExpiresAt: new Date(afterAllLeasesExpire.getTime() + 30_000),
    });
    expect(available.map(({ label }) => label)).toEqual(['T+5s', 'T+10s']);
    await expect(
      repository.listDueCheckpoints(afterAllLeasesExpire, 10),
    ).resolves.toHaveLength(2);
  });
});

function symbol(status: string, spotTradingAllowed: boolean) {
  return {
    provider: 'binance' as const,
    symbol: 'TESTUSDT',
    baseAsset: 'TEST',
    quoteAsset: 'USDT' as const,
    status,
    spotTradingAllowed,
  };
}

function detectedRow(symbol: string, detectedAt: Date) {
  return {
    provider: 'binance',
    symbol,
    baseAsset: symbol.replace(/USDT$/, ''),
    quoteAsset: 'USDT',
    status: 'TRADING',
    spotTradingAllowed: true,
    firstObservedAt: detectedAt,
    lastObservedAt: detectedAt,
    detectedAt,
  };
}
