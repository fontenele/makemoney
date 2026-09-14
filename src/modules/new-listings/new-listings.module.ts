import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SpotSymbolCatalogService } from './application/spot-symbol-catalog.service';
import { SpotSymbolDetectionReadModelService } from './application/spot-symbol-detection-read-model.service';
import {
  NEW_LISTINGS_POLL_INTERVAL_MS,
  SPOT_SYMBOL_CATALOG_PROVIDER,
  SPOT_SYMBOL_REPOSITORY,
} from './domain/spot-symbol-catalog';
import { BinanceSpotSymbolCatalogClient } from './infrastructure/binance-spot-symbol-catalog.client';
import { PrismaSpotSymbolRepository } from './infrastructure/prisma-spot-symbol.repository';
import { NewListingsController } from './presentation/new-listings.controller';
import { DueListingObservationCheckpointService } from './application/due-listing-observation-checkpoint.service';

@Module({
  controllers: [NewListingsController],
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
    {
      provide: NEW_LISTINGS_POLL_INTERVAL_MS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        config.getOrThrow<number>('NEW_LISTINGS_POLL_INTERVAL_MS'),
    },
    SpotSymbolCatalogService,
    SpotSymbolDetectionReadModelService,
    DueListingObservationCheckpointService,
  ],
  exports: [SpotSymbolCatalogService],
})
export class NewListingsModule {}
