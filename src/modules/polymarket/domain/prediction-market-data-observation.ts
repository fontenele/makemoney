import type { PredictionMarketOutcomeMidpoint } from './prediction-market-midpoint';
import type { PredictionMarketTopOfBook } from './prediction-market-top-of-book';

export type PredictionMarketDataCoherence =
  | {
      status: 'verified';
      bookMidpoint: string;
      reason: null;
    }
  | {
      status: 'unverifiable';
      bookMidpoint: null;
      reason: 'missing_bid' | 'missing_ask' | 'missing_bid_and_ask';
    };

export interface PredictionMarketDataObservation {
  provider: 'polymarket';
  tokenId: string;
  midpoint: PredictionMarketOutcomeMidpoint;
  topOfBook: PredictionMarketTopOfBook;
  coherence: PredictionMarketDataCoherence;
  executable: false;
}

export class PredictionMarketDataIncoherentError extends Error {
  constructor(
    readonly tokenId: string,
    readonly providerMidpoint: string,
    readonly bookMidpoint: string | null,
    readonly reason: 'identity_mismatch' | 'midpoint_mismatch',
  ) {
    super(`Incoherent Polymarket market data for token ${tokenId}`);
    this.name = PredictionMarketDataIncoherentError.name;
  }
}
