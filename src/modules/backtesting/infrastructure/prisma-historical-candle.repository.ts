import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { HistoricalCandle } from '../domain/historical-candle';
import { HistoricalCandleRepository } from '../domain/historical-candle-repository';
import { HistoricalCandleRequest } from '../domain/historical-candle-provider';
import Decimal from 'decimal.js';

const DECIMAL_PATTERN = /^(0|[1-9]\d*)(\.\d+)?$/;
const MAX_HISTORICAL_CANDLE_LIMIT = 10_000;
const ONE_MINUTE_MS = 60_000;

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

  async findRange(
    request: HistoricalCandleRequest,
  ): Promise<HistoricalCandle[]> {
    validateRequest(request);
    const rows = await this.prisma.historicalCandleRecord.findMany({
      where: {
        symbol: request.symbol,
        interval: request.interval,
        openTime: { gte: request.startTime, lte: request.endTime },
      },
      orderBy: { openTime: 'asc' },
      take: request.limit,
    });
    return rows.map(toCandle);
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

function toCandle(row: PersistedCandleRow): HistoricalCandle {
  if (
    row.symbol !== 'BTC/USDT' ||
    row.interval !== '1m' ||
    !row.isClosed ||
    !Number.isSafeInteger(Number(row.tradeCount)) ||
    row.tradeCount < 0n ||
    row.closeTime.getTime() <= row.openTime.getTime() ||
    !isCoherentOhlcv(row)
  ) {
    throw new Error('Invalid persisted historical candle');
  }

  return {
    symbol: row.symbol,
    interval: row.interval,
    openPrice: row.openPrice,
    highPrice: row.highPrice,
    lowPrice: row.lowPrice,
    closePrice: row.closePrice,
    baseVolume: row.baseVolume,
    quoteVolume: row.quoteVolume,
    takerBuyBaseVolume: row.takerBuyBaseVolume,
    takerBuyQuoteVolume: row.takerBuyQuoteVolume,
    tradeCount: Number(row.tradeCount),
    openTime: row.openTime,
    closeTime: row.closeTime,
    isClosed: true,
  };
}

function validateRequest(request: HistoricalCandleRequest): void {
  const startTime = request.startTime.getTime();
  const endTime = request.endTime.getTime();
  if (
    request.symbol !== 'BTC/USDT' ||
    request.interval !== '1m' ||
    !Number.isSafeInteger(startTime) ||
    !Number.isSafeInteger(endTime) ||
    startTime < 0 ||
    endTime < startTime ||
    !Number.isInteger(request.limit) ||
    request.limit < 1 ||
    request.limit > MAX_HISTORICAL_CANDLE_LIMIT ||
    endTime - startTime > MAX_HISTORICAL_CANDLE_LIMIT * ONE_MINUTE_MS
  ) {
    throw new Error('Invalid persisted historical candle request');
  }
}

function isCoherentOhlcv(row: PersistedCandleRow): boolean {
  const decimalValues = [
    row.openPrice,
    row.highPrice,
    row.lowPrice,
    row.closePrice,
    row.baseVolume,
    row.quoteVolume,
    row.takerBuyBaseVolume,
    row.takerBuyQuoteVolume,
  ];
  if (!decimalValues.every((value) => DECIMAL_PATTERN.test(value))) {
    return false;
  }

  const open = new Decimal(row.openPrice);
  const high = new Decimal(row.highPrice);
  const low = new Decimal(row.lowPrice);
  const close = new Decimal(row.closePrice);
  const volumes = decimalValues.slice(4).map((value) => new Decimal(value));
  return (
    open.isPositive() &&
    high.isPositive() &&
    low.isPositive() &&
    close.isPositive() &&
    high.greaterThanOrEqualTo(Decimal.max(open, low, close)) &&
    low.lessThanOrEqualTo(Decimal.min(open, high, close)) &&
    volumes.every((volume) => volume.greaterThanOrEqualTo(0))
  );
}
