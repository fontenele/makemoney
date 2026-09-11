import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PaperExecutionRepository } from '../domain/paper-execution-repository';
import { PaperMarketBuyQuote } from '../domain/paper-market-buy-quote';
import { PaperMarketSellQuote } from '../domain/paper-market-sell-quote';
import { PaperExecution } from '../domain/trading-executor';

@Injectable()
export class PrismaPaperExecutionRepository implements PaperExecutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(id: string): Promise<PaperExecution | undefined> {
    const row = await this.prisma.paperExecution.findUnique({ where: { id } });
    return row ? mapExecution(row, false) : undefined;
  }

  async listRecent(limit: number): Promise<PaperExecution[]> {
    const rows = await this.prisma.paperExecution.findMany({
      orderBy: [{ executedAt: 'desc' }, { id: 'desc' }],
      take: limit,
    });
    return rows.map((row) => mapExecution(row, false));
  }

  async listAllChronological(): Promise<PaperExecution[]> {
    const rows = await this.prisma.paperExecution.findMany({
      orderBy: [{ executedAt: 'asc' }, { id: 'asc' }],
    });
    return rows.map((row) => mapExecution(row, false));
  }

  async executeBuy(
    id: string,
    quote: PaperMarketBuyQuote,
  ): Promise<PaperExecution> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.paperExecution.create({
          data: {
            id,
            symbol: quote.symbol,
            side: quote.side,
            quantity: quote.quantity,
            price: quote.price,
            notional: quote.notional,
            feeRate: quote.feeRate,
            fee: quote.fee,
            totalCost: quote.totalCost,
            quotedAt: quote.quotedAt,
            marketDataReceivedAt: quote.marketDataReceivedAt,
          },
        });
        const debited = await tx.$executeRaw`
          UPDATE "paper_balances"
          SET "amount" = "amount" - CAST(${quote.totalCost} AS DECIMAL(38,18)),
              "updated_at" = CURRENT_TIMESTAMP
          WHERE "asset" = 'USDT'
            AND "amount" >= CAST(${quote.totalCost} AS DECIMAL(38,18))
        `;
        if (debited !== 1)
          throw new RangeError('Insufficient USDT paper balance');

        const credited = await tx.$executeRaw`
          UPDATE "paper_balances"
          SET "amount" = "amount" + CAST(${quote.quantity} AS DECIMAL(38,18)),
              "updated_at" = CURRENT_TIMESTAMP
          WHERE "asset" = 'BTC'
        `;
        if (credited !== 1)
          throw new Error('BTC paper balance is not initialized');
        return mapExecution(row, false);
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.find(id);
        if (existing) return { ...existing, replayed: true };
      }
      throw error;
    }
  }

  async executeSell(
    id: string,
    quote: PaperMarketSellQuote,
  ): Promise<PaperExecution> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.paperExecution.create({
          data: {
            id,
            symbol: quote.symbol,
            side: quote.side,
            quantity: quote.quantity,
            price: quote.price,
            notional: quote.notional,
            feeRate: quote.feeRate,
            fee: quote.fee,
            netProceeds: quote.netProceeds,
            quotedAt: quote.quotedAt,
            marketDataReceivedAt: quote.marketDataReceivedAt,
          },
        });
        const debited = await tx.$executeRaw`
          UPDATE "paper_balances"
          SET "amount" = "amount" - CAST(${quote.quantity} AS DECIMAL(38,18)),
              "updated_at" = CURRENT_TIMESTAMP
          WHERE "asset" = 'BTC'
            AND "amount" >= CAST(${quote.quantity} AS DECIMAL(38,18))
        `;
        if (debited !== 1)
          throw new RangeError('Insufficient BTC paper balance');

        const credited = await tx.$executeRaw`
          UPDATE "paper_balances"
          SET "amount" = "amount" + CAST(${quote.netProceeds} AS DECIMAL(38,18)),
              "updated_at" = CURRENT_TIMESTAMP
          WHERE "asset" = 'USDT'
        `;
        if (credited !== 1)
          throw new Error('USDT paper balance is not initialized');
        return mapExecution(row, false);
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.find(id);
        if (existing) return { ...existing, replayed: true };
      }
      throw error;
    }
  }
}

function mapExecution(
  row: {
    id: string;
    symbol: string;
    side: string;
    quantity: Prisma.Decimal;
    price: Prisma.Decimal;
    notional: Prisma.Decimal;
    feeRate: Prisma.Decimal;
    fee: Prisma.Decimal;
    totalCost: Prisma.Decimal | null;
    netProceeds: Prisma.Decimal | null;
    quotedAt: Date;
    marketDataReceivedAt: Date;
    executedAt: Date;
  },
  replayed: boolean,
): PaperExecution {
  if (row.symbol !== 'BTC/USDT')
    throw new Error('Invalid persisted paper execution');
  const base = {
    id: row.id,
    symbol: 'BTC/USDT' as const,
    quantity: row.quantity.toFixed(),
    price: row.price.toFixed(),
    notional: row.notional.toFixed(),
    feeRate: row.feeRate.toFixed(),
    fee: row.fee.toFixed(),
    quotedAt: row.quotedAt,
    marketDataReceivedAt: row.marketDataReceivedAt,
    executedAt: row.executedAt,
    replayed,
  };
  if (row.side === 'buy' && row.totalCost && !row.netProceeds) {
    return { ...base, side: row.side, totalCost: row.totalCost.toFixed() };
  }
  if (row.side === 'sell' && row.netProceeds && !row.totalCost) {
    return {
      ...base,
      side: row.side,
      netProceeds: row.netProceeds.toFixed(),
    };
  }
  throw new Error('Invalid persisted paper execution settlement');
}
