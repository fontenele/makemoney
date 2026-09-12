import { Injectable, Logger } from '@nestjs/common';
import { MarketCandle } from '../domain/market-candle';

export type MarketCandleHandler = (candle: MarketCandle) => void;

@Injectable()
export class MarketCandleFeedService {
  private readonly logger = new Logger(MarketCandleFeedService.name);
  private readonly handlers = new Set<MarketCandleHandler>();

  subscribe(handler: MarketCandleHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  publish(candle: MarketCandle): void {
    for (const handler of this.handlers) {
      try {
        handler(candle);
      } catch (error: unknown) {
        this.logger.error({
          event: 'market.candle.subscriber_failed',
          error: error instanceof Error ? error.message : 'unknown_error',
        });
      }
    }
  }
}
