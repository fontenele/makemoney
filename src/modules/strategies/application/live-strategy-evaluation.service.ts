import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { MarketCandleFeedService } from '../../market-data/application/market-candle-feed.service';
import { MarketCandle } from '../../market-data/domain/market-candle';
import {
  MOVING_AVERAGE_CROSSOVER_STRATEGY,
  Strategy,
  StrategyCandle,
} from '../domain/strategy';

const CLOSED_CANDLE_CAPACITY = 6;

@Injectable()
export class LiveStrategyEvaluationService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(LiveStrategyEvaluationService.name);
  private readonly closedCandles: StrategyCandle[] = [];
  private unsubscribe: (() => void) | undefined;

  constructor(
    private readonly candleFeed: MarketCandleFeedService,
    @Inject(MOVING_AVERAGE_CROSSOVER_STRATEGY)
    private readonly strategy: Strategy,
  ) {}

  onModuleInit(): void {
    this.unsubscribe = this.candleFeed.subscribe((candle) =>
      this.handleCandle(candle),
    );
  }

  onModuleDestroy(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private handleCandle(candle: MarketCandle): void {
    if (!candle.isClosed) return;

    const latest = this.closedCandles.at(-1);
    if (latest && candle.closeTime.getTime() <= latest.closeTime.getTime()) {
      this.logger.warn({
        event: 'strategy.candle_ignored',
        strategy: 'moving_average_crossover',
        symbol: candle.symbol,
        reason:
          candle.closeTime.getTime() === latest.closeTime.getTime()
            ? 'duplicate_close_time'
            : 'out_of_order_close_time',
        closeTime: candle.closeTime.toISOString(),
        latestCloseTime: latest.closeTime.toISOString(),
      });
      return;
    }

    this.closedCandles.push(this.toStrategyCandle(candle));
    if (this.closedCandles.length > CLOSED_CANDLE_CAPACITY) {
      this.closedCandles.shift();
    }

    const signal = this.strategy.analyze({
      symbol: candle.symbol,
      candles: [...this.closedCandles],
      evaluatedAt: candle.receivedAt,
    });
    this.logger.log({
      event: 'strategy.signal_generated',
      ...signal,
      latestCandleCloseTime:
        signal.latestCandleCloseTime?.toISOString() ?? null,
      evaluatedAt: signal.evaluatedAt.toISOString(),
    });
  }

  private toStrategyCandle(candle: MarketCandle): StrategyCandle {
    return {
      symbol: candle.symbol,
      interval: candle.interval,
      closePrice: candle.closePrice,
      openTime: candle.openTime,
      closeTime: candle.closeTime,
      isClosed: candle.isClosed,
    };
  }
}
