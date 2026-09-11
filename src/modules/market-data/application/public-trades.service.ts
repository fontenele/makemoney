import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { MarketTrade } from '../domain/market-trade';
import { TRADE_STREAM, TradeStream } from '../domain/trade-stream';

@Injectable()
export class PublicTradesService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublicTradesService.name);

  constructor(
    @Inject(TRADE_STREAM) private readonly tradeStream: TradeStream,
  ) {}

  onModuleInit(): void {
    this.tradeStream.start((trade) => this.logTrade(trade));
  }

  onModuleDestroy(): void {
    this.tradeStream.stop();
  }

  private logTrade(trade: MarketTrade): void {
    this.logger.log({
      event: 'market.trade.received',
      provider: trade.provider,
      symbol: trade.symbol,
      tradeId: trade.tradeId,
      price: trade.price,
      quantity: trade.quantity,
      takerSide: trade.takerSide,
      tradeTime: trade.tradeTime.toISOString(),
      eventTime: trade.eventTime.toISOString(),
      receivedAt: trade.receivedAt.toISOString(),
    });
  }
}
