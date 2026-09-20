import Decimal from 'decimal.js';
import {
  ListingTopOfBookObservation,
  validateListingTopOfBookObservation,
} from '../domain/listing-top-of-book-observation';
import { ListingTopOfBookImbalance } from '../domain/listing-top-of-book-imbalance';

const ImbalanceDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

export class ListingTopOfBookImbalanceCalculator {
  calculate(
    observation: ListingTopOfBookObservation,
  ): ListingTopOfBookImbalance {
    validateListingTopOfBookObservation(observation);
    const bidQuoteNotional = new ImbalanceDecimal(observation.bidPrice).times(
      observation.bidQuantity,
    );
    const askQuoteNotional = new ImbalanceDecimal(observation.askPrice).times(
      observation.askQuantity,
    );
    const displayedQuoteNotional = bidQuoteNotional.plus(askQuoteNotional);

    return {
      ...observation,
      bidQuoteNotional: bidQuoteNotional.toFixed(),
      askQuoteNotional: askQuoteNotional.toFixed(),
      imbalanceRate: displayedQuoteNotional.isZero()
        ? null
        : bidQuoteNotional
            .minus(askQuoteNotional)
            .dividedBy(displayedQuoteNotional)
            .toFixed(),
    };
  }
}
