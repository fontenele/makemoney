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

  it('preserves first observation and updates current state', async () => {
    const first = new Date('2026-09-14T01:00:00.000Z');
    const second = new Date('2026-09-14T02:00:00.000Z');
    await repository.observe({
      receivedAt: first,
      symbols: [symbol('TRADING', true)],
    });
    await repository.observe({
      receivedAt: second,
      symbols: [symbol('BREAK', false)],
    });

    await expect(
      prisma.observedSpotSymbol.findUnique({
        where: { provider_symbol: { provider: 'binance', symbol: 'TESTUSDT' } },
      }),
    ).resolves.toMatchObject({
      firstObservedAt: first,
      lastObservedAt: second,
      status: 'BREAK',
      spotTradingAllowed: false,
    });
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
