import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublicTradesService } from './application/public-trades.service';
import { TRADE_STREAM } from './domain/trade-stream';
import { BinancePublicTradesClient } from './infrastructure/binance/binance-public-trades.client';

@Module({
  providers: [
    {
      provide: TRADE_STREAM,
      inject: [ConfigService],
      useFactory: (config: ConfigService): BinancePublicTradesClient =>
        new BinancePublicTradesClient(
          config.getOrThrow<string>('BINANCE_WS_BASE_URL'),
        ),
    },
    PublicTradesService,
  ],
})
export class MarketDataModule {}
