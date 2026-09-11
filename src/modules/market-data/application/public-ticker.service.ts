import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { MarketTicker } from '../domain/market-ticker';
import { TICKER_STREAM, TickerStream } from '../domain/ticker-stream';
import { LatestMarketPriceService } from './latest-market-price.service';

@Injectable()
export class PublicTickerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublicTickerService.name);

  constructor(
    @Inject(TICKER_STREAM) private readonly tickerStream: TickerStream,
    private readonly latestMarketPrice: LatestMarketPriceService,
  ) {}

  onModuleInit(): void {
    this.tickerStream.start((ticker) => this.handleTicker(ticker));
  }

  onModuleDestroy(): void {
    this.tickerStream.stop();
  }

  private handleTicker(ticker: MarketTicker): void {
    this.latestMarketPrice.update(ticker);
    this.logger.log({
      event: 'market.ticker.received',
      provider: ticker.provider,
      symbol: ticker.symbol,
      lastPrice: ticker.lastPrice,
      eventTime: ticker.eventTime.toISOString(),
      receivedAt: ticker.receivedAt.toISOString(),
    });
  }
}
