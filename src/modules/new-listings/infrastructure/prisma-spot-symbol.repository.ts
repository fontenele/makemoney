import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  DetectedSpotSymbol,
  DetectedSpotSymbolQuery,
  SpotSymbolCatalog,
  SpotSymbol,
  SpotSymbolRepository,
} from '../domain/spot-symbol-catalog';

@Injectable()
export class PrismaSpotSymbolRepository implements SpotSymbolRepository {
  constructor(private readonly prisma: PrismaService) {}

  async observe(catalog: SpotSymbolCatalog): Promise<SpotSymbol[]> {
    if (catalog.symbols.length === 0) {
      return [];
    }

    const provider = catalog.symbols[0].provider;
    return this.prisma.$transaction(
      async (tx) => {
        const observed = await tx.observedSpotSymbol.findMany({
          where: { provider },
          select: { symbol: true },
        });
        const hadBaseline = observed.length > 0;
        const observedSymbols = new Set(observed.map(({ symbol }) => symbol));
        const newlyObserved = hadBaseline
          ? catalog.symbols.filter(({ symbol }) => !observedSymbols.has(symbol))
          : [];

        await Promise.all(
          catalog.symbols.map((symbol) =>
            tx.observedSpotSymbol.upsert({
              where: {
                provider_symbol: {
                  provider: symbol.provider,
                  symbol: symbol.symbol,
                },
              },
              create: {
                ...symbol,
                firstObservedAt: catalog.receivedAt,
                lastObservedAt: catalog.receivedAt,
                detectedAt: hadBaseline ? catalog.receivedAt : null,
              },
              update: {
                baseAsset: symbol.baseAsset,
                quoteAsset: symbol.quoteAsset,
                status: symbol.status,
                spotTradingAllowed: symbol.spotTradingAllowed,
                lastObservedAt: catalog.receivedAt,
              },
            }),
          ),
        );

        return newlyObserved;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async findDetected(
    provider: SpotSymbol['provider'],
    symbol: string,
  ): Promise<DetectedSpotSymbol | null> {
    const row = await this.prisma.observedSpotSymbol.findUnique({
      where: { provider_symbol: { provider, symbol } },
    });
    if (!row?.detectedAt) return null;
    return toDetectedSpotSymbol(row);
  }

  async listDetected({
    limit,
    detectedFrom,
    detectedTo,
    cursor,
  }: DetectedSpotSymbolQuery): Promise<DetectedSpotSymbol[]> {
    const rows = await this.prisma.observedSpotSymbol.findMany({
      where: {
        AND: [
          {
            detectedAt: {
              not: null,
              ...(detectedFrom ? { gte: detectedFrom } : {}),
              ...(detectedTo ? { lte: detectedTo } : {}),
            },
          },
          ...(cursor
            ? [
                {
                  OR: [
                    { detectedAt: { lt: cursor.detectedAt } },
                    {
                      detectedAt: cursor.detectedAt,
                      provider: { gt: cursor.provider },
                    },
                    {
                      detectedAt: cursor.detectedAt,
                      provider: cursor.provider,
                      symbol: { gt: cursor.symbol },
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      orderBy: [{ detectedAt: 'desc' }, { provider: 'asc' }, { symbol: 'asc' }],
      take: limit,
    });
    return rows.map(toDetectedSpotSymbol);
  }
}

function toDetectedSpotSymbol(row: {
  provider: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  spotTradingAllowed: boolean;
  detectedAt: Date | null;
  lastObservedAt: Date;
}): DetectedSpotSymbol {
  return {
    provider: 'binance',
    symbol: row.symbol,
    baseAsset: row.baseAsset,
    quoteAsset: 'USDT',
    status: row.status,
    spotTradingAllowed: row.spotTradingAllowed,
    detectedAt: row.detectedAt!,
    lastObservedAt: row.lastObservedAt,
  };
}
