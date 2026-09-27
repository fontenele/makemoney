import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import {
  PredictionMarketMidpointComplement,
  PredictionMarketMidpointComplementIncoherentError,
  PredictionMarketMidpointComplementStatus,
  PredictionMarketOutcomeTokensUnavailableError,
} from '../domain/prediction-market-midpoint-complement';
import { PredictionMarketDiscoveryService } from './prediction-market-discovery.service';
import { PredictionMarketPricingService } from './prediction-market-pricing.service';

const ComplementDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
});

@Injectable()
export class PredictionMarketMidpointComplementService {
  constructor(
    private readonly discovery: PredictionMarketDiscoveryService,
    private readonly pricing: PredictionMarketPricingService,
  ) {}

  async getComplement(
    marketId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketMidpointComplement> {
    const market = await this.discovery.getById(marketId, signal);
    const yesTokenId = market.outcomes.yes.tokenId;
    const noTokenId = market.outcomes.no.tokenId;
    if (yesTokenId === null || noTokenId === null) {
      throw new PredictionMarketOutcomeTokensUnavailableError(marketId);
    }
    if (yesTokenId === noTokenId) {
      throw new PredictionMarketMidpointComplementIncoherentError(marketId);
    }

    const [yes, no] = await Promise.all([
      this.pricing.getMidpoint(yesTokenId, signal),
      this.pricing.getMidpoint(noTokenId, signal),
    ]);
    if (yes.tokenId !== yesTokenId || no.tokenId !== noTokenId) {
      throw new PredictionMarketMidpointComplementIncoherentError(marketId);
    }

    const midpointSum = new ComplementDecimal(yes.price)
      .plus(no.price)
      .toFixed();
    const deviationFromOne = new ComplementDecimal(midpointSum)
      .minus(1)
      .toFixed();
    return {
      provider: 'polymarket',
      market,
      outcomes: { yes, no },
      midpointSum,
      deviationFromOne,
      status: statusOf(deviationFromOne),
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
