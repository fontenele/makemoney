import { ListingObservationCheckpointLabel } from './listing-observation-schedule';

export interface ListingTopOfBookSpreadEvolutionPoint {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  targetAt: Date;
  spreadBasisPoints: string;
  spreadBasisPointsChange: string;
}

export interface ListingTopOfBookSpreadEvolution {
  provider: 'binance';
  symbol: string;
  baselineLabel: 'T+0';
  baselineSpreadBasisPoints: string;
  points: ListingTopOfBookSpreadEvolutionPoint[];
}
