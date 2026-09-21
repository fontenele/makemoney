import { ListingObservationCheckpointLabel } from './listing-observation-schedule';

export interface ListingObservationPricePathEvent {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  lastPrice: string;
}

export interface ListingObservationPricePathDrawdown {
  peak: ListingObservationPricePathEvent;
  trough: ListingObservationPricePathEvent;
  absolutePriceDrawdown: string;
  priceDrawdownRate: string;
}

export interface ListingObservationPricePathStatistics {
  provider: 'binance';
  symbol: string;
  observedHigh: ListingObservationPricePathEvent;
  observedLow: ListingObservationPricePathEvent;
  maximumDrawdown: ListingObservationPricePathDrawdown;
}
