import { Inject, Injectable } from '@nestjs/common';
import {
  PREDICTION_MARKET_LAST_TRADE_PROVIDER,
  PredictionMarketLastTradeObservation,
  PredictionMarketLastTradeProvider,
} from '../domain/prediction-market-last-trade';

@Injectable()
export class PredictionMarketLastTradeService {
  constructor(
    @Inject(PREDICTION_MARKET_LAST_TRADE_PROVIDER)
    private readonly provider: PredictionMarketLastTradeProvider,
  ) {}

  getLastTrade(
    tokenId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketLastTradeObservation> {
    return this.provider.getLastTrade(tokenId, signal);
  }
}
