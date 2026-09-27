import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PredictionMarketDiscoveryService } from './application/prediction-market-discovery.service';
import { PredictionMarketOrderBookService } from './application/prediction-market-order-book.service';
import { PredictionMarketPricingService } from './application/prediction-market-pricing.service';
import { PREDICTION_MARKET_MIDPOINT_PROVIDER } from './domain/prediction-market-midpoint';
import { PREDICTION_MARKET_ORDER_BOOK_PROVIDER } from './domain/prediction-market-top-of-book';
import { PREDICTION_MARKET_PROVIDER } from './domain/prediction-market';
import { PolymarketClobMidpointClient } from './infrastructure/polymarket-clob-midpoint.client';
import { PolymarketClobOrderBookClient } from './infrastructure/polymarket-clob-order-book.client';
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
      provide: PREDICTION_MARKET_ORDER_BOOK_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new PolymarketClobOrderBookClient(
          config.getOrThrow<string>('POLYMARKET_CLOB_BASE_URL'),
        ),
    },
    PredictionMarketDiscoveryService,
    PredictionMarketOrderBookService,
    PredictionMarketPricingService,
  ],
})
export class PolymarketModule {}
