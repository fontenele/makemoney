import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PredictionMarketDiscoveryService } from './application/prediction-market-discovery.service';
import { PredictionDataFreshnessService } from './application/prediction-data-freshness.service';
import { PredictionMarketBinaryPriceChangeService } from './application/prediction-market-binary-price-change.service';
import { PredictionMarketBinaryResolutionService } from './application/prediction-market-binary-resolution.service';
import { PredictionEventService } from './application/prediction-event.service';
import { PredictionEventLiveVolumeService } from './application/prediction-event-live-volume.service';
import { PredictionGlobalOpenInterestService } from './application/prediction-global-open-interest.service';
import { PredictionMarketDataObservationService } from './application/prediction-market-data-observation.service';
import { PredictionMarketLastTradeService } from './application/prediction-market-last-trade.service';
import { PredictionMarketLastTradeContextService } from './application/prediction-market-last-trade-context.service';
import { PredictionMarketMidpointComplementService } from './application/prediction-market-midpoint-complement.service';
import { PredictionMarketOrderBookService } from './application/prediction-market-order-book.service';
import { PredictionMarketOpenInterestService } from './application/prediction-market-open-interest.service';
import { PredictionMarketPricingService } from './application/prediction-market-pricing.service';
import { PredictionMarketPriceChangeService } from './application/prediction-market-price-change.service';
import { PredictionMarketPriceHistoryService } from './application/prediction-market-price-history.service';
import { PredictionMarketPriceComplementAtService } from './application/prediction-market-price-complement-at.service';
import { PredictionMarketResolutionService } from './application/prediction-market-resolution.service';
import { PredictionMarketTokenParentService } from './application/prediction-market-token-parent.service';
import { PredictionTagService } from './application/prediction-tag.service';
import { PredictionSeriesService } from './application/prediction-series.service';
import { PREDICTION_MARKET_MIDPOINT_PROVIDER } from './domain/prediction-market-midpoint';
import { PREDICTION_MARKET_LAST_TRADE_PROVIDER } from './domain/prediction-market-last-trade';
import { PREDICTION_MARKET_ORDER_BOOK_PROVIDER } from './domain/prediction-market-top-of-book';
import { PREDICTION_MARKET_RESOLUTION_PROVIDER } from './domain/prediction-market-resolution';
import { PREDICTION_MARKET_PROVIDER } from './domain/prediction-market';
import { PREDICTION_MARKET_PRICE_HISTORY_PROVIDER } from './domain/prediction-market-price-history';
import { PREDICTION_MARKET_TOKEN_PARENT_PROVIDER } from './domain/prediction-market-token-parent';
import { PREDICTION_EVENT_PROVIDER } from './domain/prediction-event';
import { PREDICTION_EVENT_LIVE_VOLUME_PROVIDER } from './domain/prediction-event-live-volume';
import { PREDICTION_TAG_PROVIDER } from './domain/prediction-tag';
import { PREDICTION_SERIES_PROVIDER } from './domain/prediction-series';
import { PREDICTION_DATA_FRESHNESS_PROVIDER } from './domain/prediction-data-freshness';
import {
  PREDICTION_GLOBAL_OPEN_INTEREST_PROVIDER,
  PREDICTION_MARKET_OPEN_INTEREST_PROVIDER,
} from './domain/prediction-market-open-interest';
import { PolymarketClobMidpointClient } from './infrastructure/polymarket-clob-midpoint.client';
import { PolymarketClobMarketByTokenClient } from './infrastructure/polymarket-clob-market-by-token.client';
import { PolymarketClobLastTradeClient } from './infrastructure/polymarket-clob-last-trade.client';
import { PolymarketClobOrderBookClient } from './infrastructure/polymarket-clob-order-book.client';
import { PolymarketDataResolutionClient } from './infrastructure/polymarket-data-resolution.client';
import { PolymarketDataFreshnessClient } from './infrastructure/polymarket-data-freshness.client';
import { PolymarketDataOpenInterestClient } from './infrastructure/polymarket-data-open-interest.client';
import { PolymarketDataPriceHistoryClient } from './infrastructure/polymarket-data-price-history.client';
import { PolymarketDataEventLiveVolumeClient } from './infrastructure/polymarket-data-event-live-volume.client';
import { PolymarketGammaMarketClient } from './infrastructure/polymarket-gamma-market.client';
import { PolymarketGammaEventClient } from './infrastructure/polymarket-gamma-event.client';
import { PolymarketGammaTagClient } from './infrastructure/polymarket-gamma-tag.client';
import { PolymarketGammaSeriesClient } from './infrastructure/polymarket-gamma-series.client';
import { PolymarketController } from './presentation/polymarket.controller';
import { PolymarketEnabledGuard } from './presentation/polymarket-enabled.guard';

@Module({
  controllers: [PolymarketController],
  providers: [
    {
      provide: PREDICTION_EVENT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketGammaEventClient(
          config.getOrThrow<string>('POLYMARKET_GAMMA_BASE_URL'),
        ),
    },
    {
      provide: PREDICTION_MARKET_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketGammaMarketClient(
          config.getOrThrow<string>('POLYMARKET_GAMMA_BASE_URL'),
        ),
    },
    {
      provide: PREDICTION_TAG_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketGammaTagClient(
          config.getOrThrow<string>('POLYMARKET_GAMMA_BASE_URL'),
        ),
    },
    {
      provide: PREDICTION_SERIES_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketGammaSeriesClient(
          config.getOrThrow<string>('POLYMARKET_GAMMA_BASE_URL'),
        ),
    },
    {
      provide: PREDICTION_MARKET_MIDPOINT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketClobMidpointClient(
          config.getOrThrow<string>('POLYMARKET_CLOB_BASE_URL'),
        ),
    },
    {
      provide: PREDICTION_MARKET_TOKEN_PARENT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketClobMarketByTokenClient(
          config.getOrThrow<string>('POLYMARKET_CLOB_BASE_URL'),
        ),
    },
    {
      provide: PREDICTION_MARKET_LAST_TRADE_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketClobLastTradeClient(
          config.getOrThrow<string>('POLYMARKET_CLOB_BASE_URL'),
        ),
    },
    {
      provide: PREDICTION_MARKET_ORDER_BOOK_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketClobOrderBookClient(
          config.getOrThrow<string>('POLYMARKET_CLOB_BASE_URL'),
        ),
    },
    {
      provide: PREDICTION_DATA_FRESHNESS_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketDataFreshnessClient(
          config.getOrThrow<string>('POLYMARKET_DATA_BASE_URL'),
        ),
    },
    {
      provide: PREDICTION_MARKET_RESOLUTION_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketDataResolutionClient(
          config.getOrThrow<string>('POLYMARKET_DATA_BASE_URL'),
        ),
    },
    {
      provide: PREDICTION_MARKET_OPEN_INTEREST_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketDataOpenInterestClient(
          config.getOrThrow<string>('POLYMARKET_DATA_BASE_URL'),
        ),
    },
    {
      provide: PREDICTION_EVENT_LIVE_VOLUME_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketDataEventLiveVolumeClient(
          config.getOrThrow<string>('POLYMARKET_DATA_BASE_URL'),
        ),
    },
    {
      provide: PREDICTION_GLOBAL_OPEN_INTEREST_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketDataOpenInterestClient(
          config.getOrThrow<string>('POLYMARKET_DATA_BASE_URL'),
        ),
    },
    {
      provide: PREDICTION_MARKET_PRICE_HISTORY_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketDataPriceHistoryClient(
          config.getOrThrow<string>('POLYMARKET_DATA_BASE_URL'),
        ),
    },
    PredictionMarketDiscoveryService,
    PredictionDataFreshnessService,
    PredictionEventService,
    PredictionEventLiveVolumeService,
    PredictionGlobalOpenInterestService,
    PredictionMarketBinaryPriceChangeService,
    PredictionMarketBinaryResolutionService,
    PredictionMarketDataObservationService,
    PredictionMarketLastTradeContextService,
    PredictionMarketLastTradeService,
    PredictionMarketMidpointComplementService,
    PredictionMarketOrderBookService,
    PredictionMarketOpenInterestService,
    PredictionMarketPricingService,
    PredictionMarketPriceChangeService,
    PredictionMarketPriceHistoryService,
    PredictionMarketPriceComplementAtService,
    PredictionMarketResolutionService,
    PredictionMarketTokenParentService,
    PredictionTagService,
    PredictionSeriesService,
    PolymarketEnabledGuard,
  ],
})
export class PolymarketModule {}
