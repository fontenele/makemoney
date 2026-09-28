import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  PredictionMarketOutcomeTokensUnavailableError,
  PredictionMarketMidpointComplementStatus,
} from '../domain/prediction-market-midpoint-complement';
import {
  PredictionMarketPriceComplementAt,
  PredictionMarketPriceComplementAtIncoherentError,
} from '../domain/prediction-market-price-complement-at';
import { PredictionMarketDiscoveryService } from './prediction-market-discovery.service';
import { PredictionMarketPriceHistoryService } from './prediction-market-price-history.service';

const ComplementDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
});

@Injectable()
export class PredictionMarketPriceComplementAtService {
  constructor(
    private readonly discovery: PredictionMarketDiscoveryService,
    private readonly priceHistory: PredictionMarketPriceHistoryService,
  ) {}

  async getComplementAt(
    marketId: string,
    at: Date,
    signal?: AbortSignal,
  ): Promise<PredictionMarketPriceComplementAt> {
    const market = await this.discovery.getById(marketId, signal);
    const yesTokenId = market.outcomes.yes.tokenId;
    const noTokenId = market.outcomes.no.tokenId;
    if (yesTokenId === null || noTokenId === null) {
      throw new PredictionMarketOutcomeTokensUnavailableError(marketId);
    }
    if (yesTokenId === noTokenId) {
      throw new PredictionMarketPriceComplementAtIncoherentError(marketId);
    }
    const [yes, no] = await Promise.all([
      this.priceHistory.getPriceAt(yesTokenId, at, signal),
      this.priceHistory.getPriceAt(noTokenId, at, signal),
    ]);
    if (
      yes.tokenId !== yesTokenId ||
      no.tokenId !== noTokenId ||
      yes.requestedAt.getTime() !== at.getTime() ||
      no.requestedAt.getTime() !== at.getTime()
    ) {
      throw new PredictionMarketPriceComplementAtIncoherentError(marketId);
    }
    const priceSum = new ComplementDecimal(yes.price).plus(no.price).toFixed();
    const deviationFromOne = new ComplementDecimal(priceSum).minus(1).toFixed();
    return {
      provider: 'polymarket',
      market,
      requestedAt: at,
      outcomes: { yes, no },
      priceSum,
      deviationFromOne,
      status: statusOf(deviationFromOne),
      sameObservedTimestamp:
        yes.observedAt.getTime() === no.observedAt.getTime(),
      sameResolution: yes.resolutionSeconds === no.resolutionSeconds,
      atomicSnapshot: false,
      executable: false,
    };
  }
}

function statusOf(
  deviationFromOne: string,
): PredictionMarketMidpointComplementStatus {
  const deviation = new ComplementDecimal(deviationFromOne);
  if (deviation.isZero()) return 'balanced';
  return deviation.isNegative() ? 'below_one' : 'above_one';
}
