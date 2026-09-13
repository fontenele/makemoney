import 'dotenv/config';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { HistoricalCandle } from '../src/modules/backtesting/domain/historical-candle';
import { PrismaHistoricalCandleRepository } from '../src/modules/backtesting/infrastructure/prisma-historical-candle.repository';

const openTime = new Date('2026-09-13T15:20:00.000Z');

describe('Historical candle persistence (e2e)', () => {
  let prisma: PrismaService;
  let repository: PrismaHistoricalCandleRepository;

  beforeAll(async () => {
    prisma = new PrismaService(
      process.env.DATABASE_URL ??
        'postgresql://crypto_trader:crypto_trader@localhost:5433/crypto_trader?schema=public',
    );
    await prisma.onModuleInit();
    repository = new PrismaHistoricalCandleRepository(prisma);
  });

  beforeEach(async () => {
    await prisma.historicalCandleRecord.deleteMany({
      where: {
        symbol: 'BTC/USDT',
        interval: '1m',
        openTime: {
          gte: openTime,
          lte: new Date(openTime.getTime() + 2 * 60_000),
        },
      },
    });
  });

  afterAll(async () => {
    await prisma.historicalCandleRecord.deleteMany({
      where: {
        symbol: 'BTC/USDT',
        interval: '1m',
        openTime: {
          gte: openTime,
          lte: new Date(openTime.getTime() + 2 * 60_000),
        },
      },
    });
    await prisma.onModuleDestroy();
  });

  it('stores an exact candle idempotently', async () => {
    const value = candle();

    await repository.saveMany([value]);
    await repository.saveMany([value]);

    const rows = await prisma.historicalCandleRecord.findMany({
      where: { symbol: 'BTC/USDT', interval: '1m', openTime },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      openPrice: value.openPrice,
      closePrice: value.closePrice,
      baseVolume: value.baseVolume,
      tradeCount: 10n,
      isClosed: true,
    });
  });

  it('rolls back a batch containing an identity conflict', async () => {
    const stored = candle();
    await repository.saveMany([stored]);
    const newOpenTime = new Date(openTime.getTime() + 60_000);
    const conflicting: HistoricalCandle = {
      ...stored,
      closePrice: '101',
    };
    const additional: HistoricalCandle = {
      ...stored,
      openTime: newOpenTime,
      closeTime: new Date(newOpenTime.getTime() + 59_999),
    };

    await expect(
      repository.saveMany([additional, conflicting]),
    ).rejects.toThrow('Historical candle persistence conflict');
    await expect(
      prisma.historicalCandleRecord.count({
        where: { symbol: 'BTC/USDT', interval: '1m', openTime: newOpenTime },
      }),
    ).resolves.toBe(0);
  });

  it('reads stored candles chronologically within the requested limit', async () => {
    const first = candle();
    const second = shiftedCandle(first, 1);
    const third = shiftedCandle(first, 2);
    await repository.saveMany([third, first, second]);

    const rows = await repository.findRange({
      symbol: 'BTC/USDT',
      interval: '1m',
      startTime: first.openTime,
      endTime: third.openTime,
      limit: 2,
    });

    expect(rows.map((row) => row.openTime)).toEqual([
      first.openTime,
      second.openTime,
    ]);
  });
});

function shiftedCandle(
  value: HistoricalCandle,
  minuteOffset: number,
): HistoricalCandle {
  return {
    ...value,
    openTime: new Date(value.openTime.getTime() + minuteOffset * 60_000),
    closeTime: new Date(value.closeTime.getTime() + minuteOffset * 60_000),
  };
}

function candle(): HistoricalCandle {
  return {
    symbol: 'BTC/USDT',
    interval: '1m',
    openPrice: '99999.12345678901234567890123456789',
    highPrice: '100001.12345678901234567890123456789',
    lowPrice: '99998.12345678901234567890123456789',
    closePrice: '100000.12345678901234567890123456789',
    baseVolume: '1.500000000000000000000000000000000000001',
    quoteVolume: '150000.1845678901234567890123456789012345',
    takerBuyBaseVolume: '0.750000000000000000000000000000000000001',
    takerBuyQuoteVolume: '75000.09228394506172839450617283945061725',
    tradeCount: 10,
    openTime,
    closeTime: new Date(openTime.getTime() + 59_999),
    isClosed: true,
  };
}
