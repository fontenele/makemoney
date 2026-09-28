import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  PredictionMarketPriceChange,
  PredictionMarketPriceChangeDirection,
  PredictionMarketPriceChangeIncoherentError,
} from '../domain/prediction-market-price-change';
import { PredictionMarketPriceHistoryService } from './prediction-market-price-history.service';

const PriceChangeDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
});

@Injectable()
export class PredictionMarketPriceChangeService {
  constructor(
    private readonly priceHistory: PredictionMarketPriceHistoryService,
  ) {}

  async getPriceChange(
    tokenId: string,
    from: Date,
    to: Date,
    signal?: AbortSignal,
  ): Promise<PredictionMarketPriceChange> {
    const [fromObservation, toObservation] = await Promise.all([
      this.priceHistory.getPriceAt(tokenId, from, signal),
      this.priceHistory.getPriceAt(tokenId, to, signal),
    ]);
    if (
      fromObservation.tokenId !== tokenId ||
      toObservation.tokenId !== tokenId ||
      fromObservation.requestedAt.getTime() !== from.getTime() ||
      toObservation.requestedAt.getTime() !== to.getTime() ||
      fromObservation.observedAt.getTime() > toObservation.observedAt.getTime()
    ) {
      throw new PredictionMarketPriceChangeIncoherentError(tokenId);
    }
    const priceChange = new PriceChangeDecimal(toObservation.price)
      .minus(fromObservation.price)
      .toFixed();
    return {
      provider: 'polymarket',
      tokenId,
      requestedFrom: from,
      requestedTo: to,
      observations: {
        from: fromObservation,
        to: toObservation,
      },
      priceChange,
      direction: directionOf(priceChange),
      sameObservedTimestamp:
        fromObservation.observedAt.getTime() ===
        toObservation.observedAt.getTime(),
      sameResolution:
        fromObservation.resolutionSeconds === toObservation.resolutionSeconds,
      executable: false,
    };
  }
}

function directionOf(
  priceChange: string,
): PredictionMarketPriceChangeDirection {
  const change = new PriceChangeDecimal(priceChange);
  if (change.isZero()) return 'unchanged';
  return change.isNegative() ? 'down' : 'up';
}
