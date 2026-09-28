import type { PredictionMarketHistoricalPriceObservation } from './prediction-market-price-history';

export type PredictionMarketPriceChangeDirection = 'down' | 'unchanged' | 'up';

export interface PredictionMarketPriceChange {
  provider: 'polymarket';
  tokenId: string;
  requestedFrom: Date;
  requestedTo: Date;
  observations: {
    from: PredictionMarketHistoricalPriceObservation;
    to: PredictionMarketHistoricalPriceObservation;
  };
  priceChange: string;
  direction: PredictionMarketPriceChangeDirection;
  sameObservedTimestamp: boolean;
  sameResolution: boolean;
  executable: false;
}

export class PredictionMarketPriceChangeIncoherentError extends Error {
  constructor(readonly tokenId: string) {
    super(
      `Incoherent Polymarket historical price change for outcome ${tokenId}`,
    );
    this.name = PredictionMarketPriceChangeIncoherentError.name;
  }
}
