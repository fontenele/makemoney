import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PaperExecutionRepository } from '../domain/paper-execution-repository';
import { PaperMarketBuyQuote } from '../domain/paper-market-buy-quote';
import { PaperExecution } from '../domain/trading-executor';

@Injectable()
export class PrismaPaperExecutionRepository implements PaperExecutionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async find(id: string): Promise<PaperExecution | undefined> {
    const row = await this.prisma.paperExecution.findUnique({ where: { id } });
    return row ? mapExecution(row, false) : undefined;
  }

  async executeBuy(
    id: string,
    quote: PaperMarketBuyQuote,
  ): Promise<PaperExecution> {
    try {
      return await this.prisma.$transaction(async (tx) => {
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
    totalCost: Prisma.Decimal;
    executedAt: Date;
  },
  replayed: boolean,
): PaperExecution {
  if (row.symbol !== 'BTC/USDT' || row.side !== 'buy')
    throw new Error('Invalid persisted paper execution');
  return {
    id: row.id,
    symbol: row.symbol,
    side: row.side,
    quantity: row.quantity.toFixed(),
    price: row.price.toFixed(),
    notional: row.notional.toFixed(),
    feeRate: row.feeRate.toFixed(),
    fee: row.fee.toFixed(),
    totalCost: row.totalCost.toFixed(),
    executedAt: row.executedAt,
    replayed,
  };
}
