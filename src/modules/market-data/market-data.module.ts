import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublicTickerService } from './application/public-ticker.service';
import { PublicTradesService } from './application/public-trades.service';
import { TICKER_STREAM } from './domain/ticker-stream';
import { TRADE_STREAM } from './domain/trade-stream';
import { BinancePublicTickerClient } from './infrastructure/binance/binance-public-ticker.client';
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
    {
      provide: TICKER_STREAM,
      inject: [ConfigService],
      useFactory: (config: ConfigService): BinancePublicTickerClient =>
        new BinancePublicTickerClient(
          config.getOrThrow<string>('BINANCE_WS_BASE_URL'),
        ),
    },
    PublicTradesService,
    PublicTickerService,
  ],
})
export class MarketDataModule {}
