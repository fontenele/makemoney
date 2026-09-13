import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  StrategyAction,
  StrategySignal,
  StrategySignalReason,
} from '../domain/strategy';
import { StrategySignalRepository } from '../domain/strategy-signal-repository';

@Injectable()
export class PrismaStrategySignalRepository implements StrategySignalRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(signal: StrategySignal): Promise<StrategySignal> {
    try {
      return mapSignal(
        await this.prisma.strategySignal.create({ data: signal }),
      );
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        signal.latestCandleCloseTime
      ) {
        const existing = await this.prisma.strategySignal.findUnique({
          where: {
            strategy_symbol_latestCandleCloseTime: {
              strategy: signal.strategy,
              symbol: signal.symbol,
              latestCandleCloseTime: signal.latestCandleCloseTime,
            },
          },
        });
        if (existing) return mapSignal(existing);
      }
      throw error;
    }
  }

  async getLatest(): Promise<StrategySignal | undefined> {
    const row = await this.prisma.strategySignal.findFirst({
      orderBy: [{ evaluatedAt: 'desc' }, { id: 'desc' }],
    });
    return row ? mapSignal(row) : undefined;
  }

  async listRecent(limit: number): Promise<StrategySignal[]> {
    const rows = await this.prisma.strategySignal.findMany({
      orderBy: [{ evaluatedAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    return rows.map(mapSignal);
  }
}

function mapSignal(row: {
  strategy: string;
  symbol: string;
  action: string;
  reason: string;
  shortPeriod: number;
  longPeriod: number;
  previousShortAverage: Prisma.Decimal | null;
  previousLongAverage: Prisma.Decimal | null;
  currentShortAverage: Prisma.Decimal | null;
  currentLongAverage: Prisma.Decimal | null;
  latestCandleCloseTime: Date | null;
  evaluatedAt: Date;
}): StrategySignal {
  if (
    row.strategy !== 'moving_average_crossover' ||
    row.symbol !== 'BTC/USDT' ||
    !isAction(row.action) ||
    !isReason(row.reason)
  ) {
    throw new Error('Invalid persisted strategy signal');
  }
  return {
    strategy: row.strategy,
    symbol: row.symbol,
    action: row.action,
    reason: row.reason,
    shortPeriod: row.shortPeriod,
    longPeriod: row.longPeriod,
    previousShortAverage: row.previousShortAverage?.toFixed() ?? null,
    previousLongAverage: row.previousLongAverage?.toFixed() ?? null,
    currentShortAverage: row.currentShortAverage?.toFixed() ?? null,
    currentLongAverage: row.currentLongAverage?.toFixed() ?? null,
    latestCandleCloseTime: row.latestCandleCloseTime,
    evaluatedAt: row.evaluatedAt,
  };
}

function isAction(value: string): value is StrategyAction {
  return value === 'buy' || value === 'sell' || value === 'hold';
}

function isReason(value: string): value is StrategySignalReason {
  return (
    value === 'bullish_moving_average_crossover' ||
    value === 'bearish_moving_average_crossover' ||
    value === 'no_moving_average_crossover' ||
    value === 'insufficient_closed_candles'
  );
}
