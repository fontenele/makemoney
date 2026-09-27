import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PredictionMarketDiscoveryService } from './application/prediction-market-discovery.service';
import { PREDICTION_MARKET_PROVIDER } from './domain/prediction-market';
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
    PredictionMarketDiscoveryService,
  ],
})
export class PolymarketModule {}
