import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  PredictionMarketBinaryPriceChange,
  PredictionMarketBinaryPriceChangeIncoherentError,
} from '../domain/prediction-market-binary-price-change';
import { PredictionMarketOutcomeTokensUnavailableError } from '../domain/prediction-market-midpoint-complement';
import type { PredictionMarketPriceChangeDirection } from '../domain/prediction-market-price-change';
import { PredictionMarketDiscoveryService } from './prediction-market-discovery.service';
import { PredictionMarketPriceChangeService } from './prediction-market-price-change.service';

const BinaryPriceChangeDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
});

@Injectable()
export class PredictionMarketBinaryPriceChangeService {
  constructor(
    private readonly discovery: PredictionMarketDiscoveryService,
    private readonly priceChange: PredictionMarketPriceChangeService,
  ) {}

  async getPriceChange(
    marketId: string,
    from: Date,
    to: Date,
    signal?: AbortSignal,
  ): Promise<PredictionMarketBinaryPriceChange> {
    const market = await this.discovery.getById(marketId, signal);
    const yesTokenId = market.outcomes.yes.tokenId;
    const noTokenId = market.outcomes.no.tokenId;
    if (yesTokenId === null || noTokenId === null) {
      throw new PredictionMarketOutcomeTokensUnavailableError(marketId);
    }
    if (yesTokenId === noTokenId) {
      throw new PredictionMarketBinaryPriceChangeIncoherentError(marketId);
    }
    const [yes, no] = await Promise.all([
      this.priceChange.getPriceChange(yesTokenId, from, to, signal),
      this.priceChange.getPriceChange(noTokenId, from, to, signal),
    ]);
    if (
      yes.tokenId !== yesTokenId ||
      no.tokenId !== noTokenId ||
      yes.requestedFrom.getTime() !== from.getTime() ||
      no.requestedFrom.getTime() !== from.getTime() ||
      yes.requestedTo.getTime() !== to.getTime() ||
      no.requestedTo.getTime() !== to.getTime()
    ) {
      throw new PredictionMarketBinaryPriceChangeIncoherentError(marketId);
    }
    const combinedPriceChange = new BinaryPriceChangeDecimal(yes.priceChange)
      .plus(no.priceChange)
      .toFixed();
    return {
      provider: 'polymarket',
      market,
      requestedFrom: from,
      requestedTo: to,
      outcomes: { yes, no },
      combinedPriceChange,
      combinedDirection: directionOf(combinedPriceChange),
      sameFromObservedTimestamp:
        yes.observations.from.observedAt.getTime() ===
        no.observations.from.observedAt.getTime(),
      sameToObservedTimestamp:
        yes.observations.to.observedAt.getTime() ===
        no.observations.to.observedAt.getTime(),
      sameFromResolution:
        yes.observations.from.resolutionSeconds ===
        no.observations.from.resolutionSeconds,
      sameToResolution:
        yes.observations.to.resolutionSeconds ===
        no.observations.to.resolutionSeconds,
      atomicSnapshot: false,
      executable: false,
    };
  }
}

function directionOf(
  priceChange: string,
): PredictionMarketPriceChangeDirection {
  const change = new BinaryPriceChangeDecimal(priceChange);
  if (change.isZero()) return 'unchanged';
  return change.isNegative() ? 'down' : 'up';
}
