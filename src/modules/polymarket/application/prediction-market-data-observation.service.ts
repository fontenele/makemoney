import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  PredictionMarketDataIncoherentError,
  PredictionMarketDataObservation,
} from '../domain/prediction-market-data-observation';
import { PredictionMarketOrderBookService } from './prediction-market-order-book.service';
import { PredictionMarketPricingService } from './prediction-market-pricing.service';

const MarketDataDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
});

@Injectable()
export class PredictionMarketDataObservationService {
  constructor(
    private readonly pricing: PredictionMarketPricingService,
    private readonly orderBook: PredictionMarketOrderBookService,
  ) {}

  async getObservation(
    tokenId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketDataObservation> {
    const [midpoint, topOfBook] = await Promise.all([
      this.pricing.getMidpoint(tokenId, signal),
      this.orderBook.getTopOfBook(tokenId, signal),
    ]);

    if (midpoint.tokenId !== tokenId || topOfBook.tokenId !== tokenId) {
      throw new PredictionMarketDataIncoherentError(
        tokenId,
        midpoint.price,
        null,
        'identity_mismatch',
      );
    }

    if (topOfBook.bid === null || topOfBook.ask === null) {
      return {
        provider: 'polymarket',
        tokenId,
        midpoint,
        topOfBook,
        coherence: {
          status: 'unverifiable',
          bookMidpoint: null,
          reason:
            topOfBook.bid === null && topOfBook.ask === null
              ? 'missing_bid_and_ask'
              : topOfBook.bid === null
                ? 'missing_bid'
                : 'missing_ask',
        },
        executable: false,
      };
    }

    const bookMidpoint = new MarketDataDecimal(topOfBook.bid.price)
      .plus(topOfBook.ask.price)
      .dividedBy(2)
      .toFixed();
    if (!new MarketDataDecimal(midpoint.price).equals(bookMidpoint)) {
      throw new PredictionMarketDataIncoherentError(
        tokenId,
        midpoint.price,
        bookMidpoint,
        'midpoint_mismatch',
      );
    }

    return {
      provider: 'polymarket',
      tokenId,
      midpoint,
      topOfBook,
      coherence: { status: 'verified', bookMidpoint, reason: null },
      executable: false,
    };
  }
}
