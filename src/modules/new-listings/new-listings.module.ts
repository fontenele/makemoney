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
import {
  LISTING_OBSERVATION_CHECKPOINT_WORKER_OPTIONS,
  ListingObservationCheckpointWorkerOptions,
} from './application/listing-observation-checkpoint-worker-options';
import { ListingObservationCheckpointCycleService } from './application/listing-observation-checkpoint-cycle.service';
import {
  LISTING_MARKET_OBSERVATION_PROVIDER,
  ListingMarketObservationProvider,
} from './domain/listing-market-observation';
import { BinanceListingMarketObservationClient } from './infrastructure/binance-listing-market-observation.client';
import { ProviderListingObservationCheckpointProcessor } from './application/provider-listing-observation-checkpoint.processor';
import { ListingObservationCheckpointWorker } from './application/listing-observation-checkpoint.worker';

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
    {
      provide: LISTING_MARKET_OBSERVATION_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new BinanceListingMarketObservationClient(
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
    {
      provide: ProviderListingObservationCheckpointProcessor,
      inject: [LISTING_MARKET_OBSERVATION_PROVIDER],
      useFactory: (provider: ListingMarketObservationProvider) =>
        new ProviderListingObservationCheckpointProcessor(provider),
    },
    {
      provide: LISTING_OBSERVATION_CHECKPOINT_WORKER_OPTIONS,
      inject: [ConfigService],
      useFactory: (
        config: ConfigService,
      ): ListingObservationCheckpointWorkerOptions => ({
        enabled: config.getOrThrow<boolean>(
          'NEW_LISTINGS_CHECKPOINT_WORKER_ENABLED',
        ),
        intervalMs: config.getOrThrow<number>(
          'NEW_LISTINGS_CHECKPOINT_WORKER_INTERVAL_MS',
        ),
        batchSize: config.getOrThrow<number>(
          'NEW_LISTINGS_CHECKPOINT_WORKER_BATCH_SIZE',
        ),
        leaseDurationMs: config.getOrThrow<number>(
          'NEW_LISTINGS_CHECKPOINT_LEASE_DURATION_MS',
        ),
      }),
    },
    {
      provide: ListingObservationCheckpointCycleService,
      inject: [
        DueListingObservationCheckpointService,
        LISTING_OBSERVATION_CHECKPOINT_WORKER_OPTIONS,
      ],
      useFactory: (
        checkpoints: DueListingObservationCheckpointService,
        options: ListingObservationCheckpointWorkerOptions,
      ) => new ListingObservationCheckpointCycleService(checkpoints, options),
    },
    {
      provide: ListingObservationCheckpointWorker,
      inject: [
        ListingObservationCheckpointCycleService,
        ProviderListingObservationCheckpointProcessor,
        LISTING_OBSERVATION_CHECKPOINT_WORKER_OPTIONS,
      ],
      useFactory: (
        cycle: ListingObservationCheckpointCycleService,
        processor: ProviderListingObservationCheckpointProcessor,
        options: ListingObservationCheckpointWorkerOptions,
      ) => new ListingObservationCheckpointWorker(cycle, processor, options),
    },
  ],
  exports: [SpotSymbolCatalogService],
})
export class NewListingsModule {}
