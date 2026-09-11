import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { Asset, PAPER_WALLET_ASSETS } from '../domain/asset';
import { PaperBalanceRepository } from '../domain/paper-balance-repository';
import { PaperWalletBalances } from '../domain/paper-wallet';

interface AmountRow {
  amount: Prisma.Decimal;
}

@Injectable()
export class PrismaPaperBalanceRepository implements PaperBalanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async initialize(defaults: PaperWalletBalances): Promise<void> {
    await this.prisma.paperBalance.createMany({
      data: PAPER_WALLET_ASSETS.map((asset) => ({
        asset,
        amount: defaults[asset],
      })),
      skipDuplicates: true,
    });
  }

  async getBalance(asset: Asset): Promise<string> {
    const balance = await this.prisma.paperBalance.findUniqueOrThrow({
      where: { asset },
    });

    return balance.amount.toFixed();
  }

  async getBalances(): Promise<PaperWalletBalances> {
    const balances = await this.prisma.paperBalance.findMany({
      where: { asset: { in: [...PAPER_WALLET_ASSETS] } },
    });
    const byAsset = new Map(
      balances.map((balance) => [balance.asset, balance.amount.toFixed()]),
    );

    return {
      BTC: requiredBalance(byAsset, 'BTC'),
      USDT: requiredBalance(byAsset, 'USDT'),
    };
  }

  async credit(asset: Asset, amount: string): Promise<string> {
    const rows = await this.prisma.$queryRaw<AmountRow[]>`
      UPDATE "paper_balances"
      SET "amount" = "amount" + CAST(${amount} AS DECIMAL(38,18)),
          "updated_at" = CURRENT_TIMESTAMP
      WHERE "asset" = ${asset}
      RETURNING "amount"
    `;

    return requiredMutation(rows, asset).amount.toFixed();
  }

  async debit(asset: Asset, amount: string): Promise<string> {
    const rows = await this.prisma.$queryRaw<AmountRow[]>`
      UPDATE "paper_balances"
      SET "amount" = "amount" - CAST(${amount} AS DECIMAL(38,18)),
          "updated_at" = CURRENT_TIMESTAMP
      WHERE "asset" = ${asset}
        AND "amount" >= CAST(${amount} AS DECIMAL(38,18))
      RETURNING "amount"
    `;

    if (rows.length === 0) {
      throw new RangeError(`Insufficient ${asset} paper balance`);
    }

    return rows[0].amount.toFixed();
  }
}

function requiredBalance(balances: Map<string, string>, asset: Asset): string {
  const balance = balances.get(asset);

  if (balance === undefined) {
    throw new Error(`Missing ${asset} paper balance`);
  }

  return balance;
}

function requiredMutation(rows: AmountRow[], asset: Asset): AmountRow {
  const row = rows[0];

  if (!row) {
    throw new Error(`Missing ${asset} paper balance`);
  }

  return row;
}
