import { Inject, Injectable } from '@nestjs/common';
import {
  PREDICTION_MARKET_MIDPOINT_PROVIDER,
  PredictionMarketMidpointProvider,
  PredictionMarketOutcomeMidpoint,
} from '../domain/prediction-market-midpoint';

@Injectable()
export class PredictionMarketPricingService {
  constructor(
    @Inject(PREDICTION_MARKET_MIDPOINT_PROVIDER)
    private readonly provider: PredictionMarketMidpointProvider,
  ) {}

  getMidpoint(
    tokenId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketOutcomeMidpoint> {
    return this.provider.getMidpoint(tokenId, signal);
  }
}
