import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { MarketTicker } from '../domain/market-ticker';
import { TICKER_STREAM, TickerStream } from '../domain/ticker-stream';

@Injectable()
export class PublicTickerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublicTickerService.name);

  constructor(
    @Inject(TICKER_STREAM) private readonly tickerStream: TickerStream,
  ) {}

  onModuleInit(): void {
    this.tickerStream.start((ticker) => this.logTicker(ticker));
  }

  onModuleDestroy(): void {
    this.tickerStream.stop();
  }

  private logTicker(ticker: MarketTicker): void {
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
