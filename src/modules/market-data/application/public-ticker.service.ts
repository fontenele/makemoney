import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { MarketTicker } from '../domain/market-ticker';
import { TICKER_STREAM, TickerStream } from '../domain/ticker-stream';
import {
  TICKER_SNAPSHOT_PROVIDER,
  TickerSnapshotProvider,
} from '../domain/ticker-snapshot-provider';
import { LatestMarketPriceService } from './latest-market-price.service';

@Injectable()
export class PublicTickerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublicTickerService.name);
  private readonly abortController = new AbortController();

  constructor(
    @Inject(TICKER_STREAM) private readonly tickerStream: TickerStream,
    @Inject(TICKER_SNAPSHOT_PROVIDER)
    private readonly tickerSnapshotProvider: TickerSnapshotProvider,
    private readonly latestMarketPrice: LatestMarketPriceService,
  ) {}

  async onModuleInit(): Promise<void> {
    this.tickerStream.start((ticker) => this.handleTicker(ticker));
    await this.loadInitialTicker();
  }

  onModuleDestroy(): void {
    this.abortController.abort();
    this.tickerStream.stop();
  }

  private async loadInitialTicker(): Promise<void> {
    try {
      const ticker = await this.tickerSnapshotProvider.load(
        this.abortController.signal,
      );

      if (ticker === null) {
        this.logger.warn('Invalid Binance BTC/USDT ticker price response');
        return;
      }

      if (!this.latestMarketPrice.getLatest()) {
        this.handleTicker(ticker);
      }
    } catch (error: unknown) {
      if (this.abortController.signal.aborted) {
        return;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        'Failed to load initial Binance BTC/USDT price',
        message,
      );
    }
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
