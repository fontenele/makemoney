import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { CANDLE_STREAM, CandleStream } from '../domain/candle-stream';
import { MarketCandle } from '../domain/market-candle';
import { MarketCandleFeedService } from './market-candle-feed.service';

@Injectable()
export class PublicCandlesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublicCandlesService.name);

  constructor(
    @Inject(CANDLE_STREAM) private readonly candleStream: CandleStream,
    private readonly candleFeed: MarketCandleFeedService,
  ) {}

  onModuleInit(): void {
    this.candleStream.start((candle) => this.handleCandle(candle));
  }

  onModuleDestroy(): void {
    this.candleStream.stop();
  }

  private handleCandle(candle: MarketCandle): void {
    this.candleFeed.publish(candle);
    this.logger.log({
      event: 'market.candle.received',
      provider: candle.provider,
      symbol: candle.symbol,
      interval: candle.interval,
      openPrice: candle.openPrice,
      highPrice: candle.highPrice,
      lowPrice: candle.lowPrice,
      closePrice: candle.closePrice,
      baseVolume: candle.baseVolume,
      quoteVolume: candle.quoteVolume,
      takerBuyBaseVolume: candle.takerBuyBaseVolume,
      takerBuyQuoteVolume: candle.takerBuyQuoteVolume,
      tradeCount: candle.tradeCount,
      openTime: candle.openTime.toISOString(),
      closeTime: candle.closeTime.toISOString(),
      isClosed: candle.isClosed,
      eventTime: candle.eventTime.toISOString(),
      receivedAt: candle.receivedAt.toISOString(),
    });
  }
}
