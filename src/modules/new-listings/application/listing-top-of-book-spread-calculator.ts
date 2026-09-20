import Decimal from 'decimal.js';
import {
  ListingTopOfBookObservation,
  validateListingTopOfBookObservation,
} from '../domain/listing-top-of-book-observation';
import { ListingTopOfBookSpread } from '../domain/listing-top-of-book-spread';

const SpreadDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

export class ListingTopOfBookSpreadCalculator {
  calculate(observation: ListingTopOfBookObservation): ListingTopOfBookSpread {
    validateListingTopOfBookObservation(observation);
    const bidPrice = new SpreadDecimal(observation.bidPrice);
    const askPrice = new SpreadDecimal(observation.askPrice);
    const absoluteSpread = askPrice.minus(bidPrice);
    const midPrice = askPrice.plus(bidPrice).dividedBy(2);

    return {
      provider: observation.provider,
      symbol: observation.symbol,
      updateId: observation.updateId,
      bidPrice: bidPrice.toFixed(),
      bidQuantity: new SpreadDecimal(observation.bidQuantity).toFixed(),
      askPrice: askPrice.toFixed(),
      askQuantity: new SpreadDecimal(observation.askQuantity).toFixed(),
      absoluteSpread: absoluteSpread.toFixed(),
      midPrice: midPrice.toFixed(),
      spreadBasisPoints: absoluteSpread
        .dividedBy(midPrice)
        .times(10_000)
        .toFixed(),
      receivedAt: observation.receivedAt,
    };
  }
}
