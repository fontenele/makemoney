import type { PredictionMarketLastTradeObservation } from './prediction-market-last-trade';
import type { PredictionMarketTopOfBook } from './prediction-market-top-of-book';

export type PredictionMarketLastTradeBookPosition =
  | 'below_bid'
  | 'at_bid'
  | 'at_bid_and_ask'
  | 'inside_spread'
  | 'at_ask'
  | 'above_ask';

export type PredictionMarketLastTradeBookRelation =
  | {
      status: 'comparable';
      position: PredictionMarketLastTradeBookPosition;
      priceMinusBid: string;
      askMinusPrice: string;
      reason: null;
    }
  | {
      status: 'unverifiable';
      position: null;
      priceMinusBid: null;
      askMinusPrice: null;
      reason: 'missing_bid' | 'missing_ask' | 'missing_bid_and_ask';
    };

export interface PredictionMarketLastTradeContext {
  provider: 'polymarket';
  tokenId: string;
  lastTrade: PredictionMarketLastTradeObservation;
  topOfBook: PredictionMarketTopOfBook;
  relation: PredictionMarketLastTradeBookRelation;
  atomicSnapshot: false;
  executable: false;
}

export class PredictionMarketLastTradeContextIncoherentError extends Error {
  constructor(readonly tokenId: string) {
    super(`Incoherent Polymarket last-trade context for token ${tokenId}`);
    this.name = PredictionMarketLastTradeContextIncoherentError.name;
  }
}
