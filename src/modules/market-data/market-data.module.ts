import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PublicCandlesService } from './application/public-candles.service';
import { PublicPairMetadataService } from './application/public-pair-metadata.service';
import { PublicTickerService } from './application/public-ticker.service';
import { PublicTopOfBookService } from './application/public-top-of-book.service';
import { PublicTradesService } from './application/public-trades.service';
import { SpreadCalculator } from './application/spread-calculator';
import { CANDLE_STREAM } from './domain/candle-stream';
import { PAIR_METADATA_PROVIDER } from './domain/pair-metadata-provider';
import { TICKER_STREAM } from './domain/ticker-stream';
import { TOP_OF_BOOK_STREAM } from './domain/top-of-book-stream';
import { TRADE_STREAM } from './domain/trade-stream';
import { BinancePublicCandlesClient } from './infrastructure/binance/binance-public-candles.client';
import { BinancePairMetadataClient } from './infrastructure/binance/binance-pair-metadata.client';
import { BinancePublicTickerClient } from './infrastructure/binance/binance-public-ticker.client';
import { BinancePublicTopOfBookClient } from './infrastructure/binance/binance-public-top-of-book.client';
import { BinancePublicTradesClient } from './infrastructure/binance/binance-public-trades.client';

@Module({
  providers: [
    {
      provide: PAIR_METADATA_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): BinancePairMetadataClient =>
        new BinancePairMetadataClient(
          config.getOrThrow<string>('BINANCE_REST_BASE_URL'),
        ),
    },
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
    {
      provide: CANDLE_STREAM,
      inject: [ConfigService],
      useFactory: (config: ConfigService): BinancePublicCandlesClient =>
        new BinancePublicCandlesClient(
          config.getOrThrow<string>('BINANCE_WS_BASE_URL'),
        ),
    },
    {
      provide: TOP_OF_BOOK_STREAM,
      inject: [ConfigService],
      useFactory: (config: ConfigService): BinancePublicTopOfBookClient =>
        new BinancePublicTopOfBookClient(
          config.getOrThrow<string>('BINANCE_WS_BASE_URL'),
        ),
    },
    PublicTradesService,
    PublicTickerService,
    PublicCandlesService,
    PublicPairMetadataService,
    SpreadCalculator,
    PublicTopOfBookService,
  ],
})
export class MarketDataModule {}
