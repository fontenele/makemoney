export type PredictionMarketLastTradeSide = 'buy' | 'sell';

export interface PredictionMarketLastTradeObservation {
  provider: 'polymarket';
  tokenId: string;
  price: string;
  side: PredictionMarketLastTradeSide;
  source: 'clob-last-trade';
  executable: false;
  providerTimestamp: null;
  receivedAt: Date;
}

export const PREDICTION_MARKET_LAST_TRADE_PROVIDER = Symbol(
  'PREDICTION_MARKET_LAST_TRADE_PROVIDER',
);

export interface PredictionMarketLastTradeProvider {
  getLastTrade(
    tokenId: string,
    signal?: AbortSignal,
  ): Promise<PredictionMarketLastTradeObservation>;
}

export class PredictionMarketLastTradeUnavailableError extends Error {
  constructor(tokenId: string) {
    super(`Polymarket last trade for token ${tokenId} is unavailable`);
    this.name = PredictionMarketLastTradeUnavailableError.name;
  }
}
