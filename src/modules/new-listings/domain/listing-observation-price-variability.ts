import { ListingObservationPricePathEvent } from './listing-observation-price-path-statistics';

export interface ListingObservationPriceTransition {
  from: ListingObservationPricePathEvent;
  to: ListingObservationPricePathEvent;
  durationMs: number;
  returnRate: string;
  absoluteReturnRate: string;
}

export interface ListingObservationPriceVariability {
  provider: 'binance';
  symbol: string;
  transitionCount: number;
  averageAbsoluteReturnRate: string | null;
  maximumAbsoluteReturn: ListingObservationPriceTransition | null;
}
