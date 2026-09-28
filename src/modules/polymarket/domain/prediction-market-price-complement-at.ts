import type { PredictionMarketDetails } from './prediction-market';
import type { PredictionMarketMidpointComplementStatus } from './prediction-market-midpoint-complement';
import type { PredictionMarketHistoricalPriceObservation } from './prediction-market-price-history';

export interface PredictionMarketPriceComplementAt {
  provider: 'polymarket';
  market: PredictionMarketDetails;
  requestedAt: Date;
  outcomes: {
    yes: PredictionMarketHistoricalPriceObservation;
    no: PredictionMarketHistoricalPriceObservation;
  };
  priceSum: string;
  deviationFromOne: string;
  status: PredictionMarketMidpointComplementStatus;
  sameObservedTimestamp: boolean;
  sameResolution: boolean;
  atomicSnapshot: false;
  executable: false;
}

export class PredictionMarketPriceComplementAtIncoherentError extends Error {
  constructor(readonly marketId: string) {
    super(
      `Incoherent Polymarket point-in-time price complement for market ${marketId}`,
    );
    this.name = PredictionMarketPriceComplementAtIncoherentError.name;
  }
}
