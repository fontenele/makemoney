import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { MarketSpread } from '../domain/market-spread';
import { MarketTopOfBook } from '../domain/market-top-of-book';

const FinancialDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

@Injectable()
export class SpreadCalculator {
  calculate(topOfBook: MarketTopOfBook): MarketSpread | null {
    const bidPrice = new FinancialDecimal(topOfBook.bidPrice);
    const askPrice = new FinancialDecimal(topOfBook.askPrice);

    if (askPrice.lessThan(bidPrice)) {
      return null;
    }

    const absoluteSpread = askPrice.minus(bidPrice);
    const midPrice = askPrice.plus(bidPrice).dividedBy(2);

    if (midPrice.lessThanOrEqualTo(0)) {
      return null;
    }

    const spreadBasisPoints = absoluteSpread.dividedBy(midPrice).times(10_000);

    return {
      provider: topOfBook.provider,
      symbol: topOfBook.symbol,
      updateId: topOfBook.updateId,
      bidPrice: bidPrice.toFixed(),
      askPrice: askPrice.toFixed(),
      absoluteSpread: absoluteSpread.toFixed(),
      midPrice: midPrice.toFixed(),
      spreadBasisPoints: spreadBasisPoints.toFixed(8),
      receivedAt: topOfBook.receivedAt,
    };
  }
}
