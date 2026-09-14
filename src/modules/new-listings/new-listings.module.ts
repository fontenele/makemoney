import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpotSymbolCatalogService } from './application/spot-symbol-catalog.service';
import {
  SPOT_SYMBOL_CATALOG_PROVIDER,
  SPOT_SYMBOL_REPOSITORY,
} from './domain/spot-symbol-catalog';
import { BinanceSpotSymbolCatalogClient } from './infrastructure/binance-spot-symbol-catalog.client';
import { PrismaSpotSymbolRepository } from './infrastructure/prisma-spot-symbol.repository';

@Module({
  providers: [
    {
      provide: SPOT_SYMBOL_CATALOG_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new BinanceSpotSymbolCatalogClient(
          config.getOrThrow<string>('BINANCE_REST_BASE_URL'),
        ),
    },
    { provide: SPOT_SYMBOL_REPOSITORY, useClass: PrismaSpotSymbolRepository },
    SpotSymbolCatalogService,
  ],
  exports: [SpotSymbolCatalogService],
})
export class NewListingsModule {}
