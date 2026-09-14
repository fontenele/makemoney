import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  SpotSymbolCatalog,
  SpotSymbolRepository,
} from '../domain/spot-symbol-catalog';

@Injectable()
export class PrismaSpotSymbolRepository implements SpotSymbolRepository {
  constructor(private readonly prisma: PrismaService) {}

  async observe(catalog: SpotSymbolCatalog): Promise<void> {
    await this.prisma.$transaction(
      catalog.symbols.map((symbol) =>
        this.prisma.observedSpotSymbol.upsert({
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
  }
}
