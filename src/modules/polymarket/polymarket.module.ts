import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PredictionMarketDiscoveryService } from './application/prediction-market-discovery.service';
import { PredictionMarketBinaryResolutionService } from './application/prediction-market-binary-resolution.service';
import { PredictionMarketDataObservationService } from './application/prediction-market-data-observation.service';
import { PredictionMarketLastTradeService } from './application/prediction-market-last-trade.service';
import { PredictionMarketLastTradeContextService } from './application/prediction-market-last-trade-context.service';
import { PredictionMarketMidpointComplementService } from './application/prediction-market-midpoint-complement.service';
import { PredictionMarketOrderBookService } from './application/prediction-market-order-book.service';
import { PredictionMarketPricingService } from './application/prediction-market-pricing.service';
import { PredictionMarketResolutionService } from './application/prediction-market-resolution.service';
import { PREDICTION_MARKET_MIDPOINT_PROVIDER } from './domain/prediction-market-midpoint';
import { PREDICTION_MARKET_LAST_TRADE_PROVIDER } from './domain/prediction-market-last-trade';
import { PREDICTION_MARKET_ORDER_BOOK_PROVIDER } from './domain/prediction-market-top-of-book';
import { PREDICTION_MARKET_RESOLUTION_PROVIDER } from './domain/prediction-market-resolution';
import { PREDICTION_MARKET_PROVIDER } from './domain/prediction-market';
import { PolymarketClobMidpointClient } from './infrastructure/polymarket-clob-midpoint.client';
import { PolymarketClobLastTradeClient } from './infrastructure/polymarket-clob-last-trade.client';
import { PolymarketClobOrderBookClient } from './infrastructure/polymarket-clob-order-book.client';
import { PolymarketDataResolutionClient } from './infrastructure/polymarket-data-resolution.client';
import { PolymarketGammaMarketClient } from './infrastructure/polymarket-gamma-market.client';
import { PolymarketController } from './presentation/polymarket.controller';

@Module({
  controllers: [PolymarketController],
  providers: [
    {
      provide: PREDICTION_MARKET_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketGammaMarketClient(
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
      provide: PREDICTION_MARKET_RESOLUTION_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketDataResolutionClient(
          config.getOrThrow<string>('POLYMARKET_DATA_BASE_URL'),
        ),
    },
    PredictionMarketDiscoveryService,
    PredictionMarketBinaryResolutionService,
    PredictionMarketDataObservationService,
    PredictionMarketLastTradeContextService,
    PredictionMarketLastTradeService,
    PredictionMarketMidpointComplementService,
    PredictionMarketOrderBookService,
    PredictionMarketPricingService,
    PredictionMarketResolutionService,
  ],
})
export class PolymarketModule {}
