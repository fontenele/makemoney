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

    await expect(repository.listDetected(10)).resolves.toEqual([
      {
        ...added,
        detectedAt: second,
        lastObservedAt: third,
      },
    ]);
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
