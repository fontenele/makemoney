import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { HistoricalCandle } from '../domain/historical-candle';
import { HistoricalCandleRepository } from '../domain/historical-candle-repository';

@Injectable()
export class PrismaHistoricalCandleRepository implements HistoricalCandleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveMany(candles: readonly HistoricalCandle[]): Promise<void> {
    if (candles.length === 0) return;

    await this.prisma.$transaction(
      async (transaction) => {
        await transaction.historicalCandleRecord.createMany({
          data: candles.map(toRecord),
          skipDuplicates: true,
        });

        const rows = await transaction.historicalCandleRecord.findMany({
          where: {
            symbol: 'BTC/USDT',
            interval: '1m',
            openTime: { in: candles.map((candle) => candle.openTime) },
          },
        });
        const rowsByOpenTime = new Map(
          rows.map((row) => [row.openTime.getTime(), row]),
        );

        for (const candle of candles) {
          const row = rowsByOpenTime.get(candle.openTime.getTime());
          if (!row || !matches(row, candle)) {
            throw new Error('Historical candle persistence conflict');
          }
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function toRecord(candle: HistoricalCandle) {
  return {
    symbol: candle.symbol,
    interval: candle.interval,
    openTime: candle.openTime,
    closeTime: candle.closeTime,
    openPrice: candle.openPrice,
    highPrice: candle.highPrice,
    lowPrice: candle.lowPrice,
    closePrice: candle.closePrice,
    baseVolume: candle.baseVolume,
    quoteVolume: candle.quoteVolume,
    takerBuyBaseVolume: candle.takerBuyBaseVolume,
    takerBuyQuoteVolume: candle.takerBuyQuoteVolume,
    tradeCount: BigInt(candle.tradeCount),
    isClosed: candle.isClosed,
  };
}

function matches(row: PersistedCandleRow, candle: HistoricalCandle): boolean {
  return (
    row.symbol === candle.symbol &&
    row.interval === candle.interval &&
    row.openTime.getTime() === candle.openTime.getTime() &&
    row.closeTime.getTime() === candle.closeTime.getTime() &&
    row.openPrice === candle.openPrice &&
    row.highPrice === candle.highPrice &&
    row.lowPrice === candle.lowPrice &&
    row.closePrice === candle.closePrice &&
    row.baseVolume === candle.baseVolume &&
    row.quoteVolume === candle.quoteVolume &&
    row.takerBuyBaseVolume === candle.takerBuyBaseVolume &&
    row.takerBuyQuoteVolume === candle.takerBuyQuoteVolume &&
    row.tradeCount === BigInt(candle.tradeCount) &&
    row.isClosed === candle.isClosed
  );
}

interface PersistedCandleRow {
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
