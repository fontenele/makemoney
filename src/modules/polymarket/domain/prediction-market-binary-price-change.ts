import type { PredictionMarketDetails } from './prediction-market';
import type {
  PredictionMarketPriceChange,
  PredictionMarketPriceChangeDirection,
} from './prediction-market-price-change';

export interface PredictionMarketBinaryPriceChange {
  provider: 'polymarket';
  market: PredictionMarketDetails;
  requestedFrom: Date;
  requestedTo: Date;
  outcomes: {
    yes: PredictionMarketPriceChange;
    no: PredictionMarketPriceChange;
  };
  combinedPriceChange: string;
  combinedDirection: PredictionMarketPriceChangeDirection;
  sameFromObservedTimestamp: boolean;
  sameToObservedTimestamp: boolean;
  sameFromResolution: boolean;
  sameToResolution: boolean;
  atomicSnapshot: false;
  executable: false;
}

export class PredictionMarketBinaryPriceChangeIncoherentError extends Error {
  constructor(readonly marketId: string) {
    super(`Incoherent Polymarket binary price change for market ${marketId}`);
    this.name = PredictionMarketBinaryPriceChangeIncoherentError.name;
  }
}
