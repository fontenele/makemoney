import { Inject, Injectable } from '@nestjs/common';
import {
  PREDICTION_MARKET_TOKEN_PARENT_PROVIDER,
  PredictionMarketTokenParent,
  PredictionMarketTokenParentProvider,
} from '../domain/prediction-market-token-parent';

@Injectable()
export class PredictionMarketTokenParentService {
  constructor(
    @Inject(PREDICTION_MARKET_TOKEN_PARENT_PROVIDER)
    private readonly provider: PredictionMarketTokenParentProvider,
  ) {}

  getByToken(
    tokenId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketTokenParent> {
    return this.provider.getByToken(tokenId, signal);
  }
}
