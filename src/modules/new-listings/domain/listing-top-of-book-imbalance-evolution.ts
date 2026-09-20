import { ListingObservationCheckpointLabel } from './listing-observation-schedule';

export interface ListingTopOfBookImbalanceEvolutionPoint {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  targetAt: Date;
  imbalanceRate: string | null;
  imbalanceChange: string | null;
}

export interface ListingTopOfBookImbalanceEvolution {
  provider: 'binance';
  symbol: string;
  baselineLabel: 'T+0';
  baselineImbalanceRate: string;
  points: ListingTopOfBookImbalanceEvolutionPoint[];
}
