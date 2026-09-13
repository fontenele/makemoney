import { jest } from '@jest/globals';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { HistoricalCandle } from '../domain/historical-candle';
import { PrismaHistoricalCandleRepository } from './prisma-historical-candle.repository';

describe('PrismaHistoricalCandleRepository', () => {
  it('stores an exact closed-candle batch atomically with duplicate skipping', async () => {
    const candles = [candle()];
    const { repository, mocks } = setup(candles.map(toRow));

    await expect(repository.saveMany(candles)).resolves.toBeUndefined();

    expect(mocks.createMany).toHaveBeenCalledWith({
      data: candles.map(toRow),
      skipDuplicates: true,
    });
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: {
        symbol: 'BTC/USDT',
        interval: '1m',
        openTime: { in: [candles[0].openTime] },
      },
    });
    expect(mocks.prismaTransaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  });

  it('accepts an identical candle already stored by an idempotent write', async () => {
    const candles = [candle()];
    const { repository } = setup(candles.map(toRow));

    await expect(repository.saveMany(candles)).resolves.toBeUndefined();
    await expect(repository.saveMany(candles)).resolves.toBeUndefined();
  });

  it('rejects a conflicting candle with the same identity', async () => {
    const candles = [candle()];
    const conflicting = { ...toRow(candles[0]), closePrice: '101' };
    const { repository } = setup([conflicting]);

    await expect(repository.saveMany(candles)).rejects.toThrow(
      'Historical candle persistence conflict',
    );
  });

  it('does not open a transaction for an empty batch', async () => {
    const { repository, mocks } = setup([]);

    await expect(repository.saveMany([])).resolves.toBeUndefined();
    expect(mocks.prismaTransaction).not.toHaveBeenCalled();
  });
});

interface StoredRow {
  symbol: string;
  interval: string;
  openTime: Date;
  closeTime: Date;
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  closePrice: string;
  baseVolume: string;
  quoteVolume: string;
  takerBuyBaseVolume: string;
  takerBuyQuoteVolume: string;
  tradeCount: bigint;
  isClosed: boolean;
}

function setup(rows: StoredRow[]) {
  const createMany = jest.fn(() => Promise.resolve({ count: rows.length }));
  const findMany = jest.fn(() => Promise.resolve(rows));
  const transaction = {
    historicalCandleRecord: {
      createMany,
      findMany,
    },
  };
  const prismaTransaction = jest.fn(
    (callback: (value: typeof transaction) => Promise<void>) =>
      callback(transaction),
  );
  const prisma = {
    $transaction: prismaTransaction,
  } as unknown as PrismaService;

  return {
    repository: new PrismaHistoricalCandleRepository(prisma),
    mocks: { createMany, findMany, prismaTransaction },
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
    openTime: new Date('2026-09-12T12:00:00.000Z'),
    closeTime: new Date('2026-09-12T12:00:59.999Z'),
    isClosed: true,
  };
}

function toRow(value: HistoricalCandle): StoredRow {
  return {
    ...value,
    tradeCount: BigInt(value.tradeCount),
  };
}
