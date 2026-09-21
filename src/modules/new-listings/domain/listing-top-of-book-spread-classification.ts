import { ListingObservationCheckpointLabel } from './listing-observation-schedule';

export interface ListingTopOfBookSpreadThresholds {
  wideningBasisPoints: string;
}

export interface ListingTopOfBookSpreadClassificationEvent {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  spreadBasisPoints: string;
  spreadBasisPointsChange: string;
}

export interface ListingTopOfBookSpreadClassification {
  provider: 'binance';
  symbol: string;
  status: 'no-widening-observed' | 'widening-observed';
  thresholds: ListingTopOfBookSpreadThresholds;
  evaluatedThroughLabel: ListingObservationCheckpointLabel;
  widening: ListingTopOfBookSpreadClassificationEvent | null;
  maximumWidening: ListingTopOfBookSpreadClassificationEvent;
}
