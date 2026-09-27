import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  PredictionMarketLastTradeBookPosition,
  PredictionMarketLastTradeContext,
  PredictionMarketLastTradeContextIncoherentError,
} from '../domain/prediction-market-last-trade-context';
import { PredictionMarketLastTradeService } from './prediction-market-last-trade.service';
import { PredictionMarketOrderBookService } from './prediction-market-order-book.service';

const ContextDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
});

@Injectable()
export class PredictionMarketLastTradeContextService {
  constructor(
    private readonly lastTrade: PredictionMarketLastTradeService,
    private readonly orderBook: PredictionMarketOrderBookService,
  ) {}

  async getContext(
    tokenId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketLastTradeContext> {
    const [lastTrade, topOfBook] = await Promise.all([
      this.lastTrade.getLastTrade(tokenId, signal),
      this.orderBook.getTopOfBook(tokenId, signal),
    ]);

    if (lastTrade.tokenId !== tokenId || topOfBook.tokenId !== tokenId) {
      throw new PredictionMarketLastTradeContextIncoherentError(tokenId);
    }

    if (topOfBook.bid === null || topOfBook.ask === null) {
      return {
        provider: 'polymarket',
        tokenId,
        lastTrade,
        topOfBook,
        relation: {
          status: 'unverifiable',
          position: null,
          priceMinusBid: null,
          askMinusPrice: null,
          reason:
            topOfBook.bid === null && topOfBook.ask === null
              ? 'missing_bid_and_ask'
              : topOfBook.bid === null
                ? 'missing_bid'
                : 'missing_ask',
        },
        atomicSnapshot: false,
        executable: false,
      };
    }

    const price = new ContextDecimal(lastTrade.price);
    const bid = new ContextDecimal(topOfBook.bid.price);
    const ask = new ContextDecimal(topOfBook.ask.price);
    return {
      provider: 'polymarket',
      tokenId,
      lastTrade,
      topOfBook,
      relation: {
        status: 'comparable',
        position: positionOf(price, bid, ask),
        priceMinusBid: price.minus(bid).toFixed(),
        askMinusPrice: ask.minus(price).toFixed(),
        reason: null,
      },
      atomicSnapshot: false,
      executable: false,
    };
  }
}

function positionOf(
  price: Decimal,
  bid: Decimal,
  ask: Decimal,
): PredictionMarketLastTradeBookPosition {
  if (price.lessThan(bid)) return 'below_bid';
  if (price.equals(bid) && price.equals(ask)) return 'at_bid_and_ask';
  if (price.equals(bid)) return 'at_bid';
  if (price.lessThan(ask)) return 'inside_spread';
  if (price.equals(ask)) return 'at_ask';
  return 'above_ask';
}
