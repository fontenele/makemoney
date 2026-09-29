import type {
  PolymarketBinaryPriceChange,
  PolymarketPriceChangeObservation,
} from './api';

export interface PolymarketPriceChangeObservationRow {
  key: 'from-yes' | 'from-no' | 'to-yes' | 'to-no';
  boundary: 'Earlier' | 'Later';
  outcome: 'YES' | 'NO';
  requestedAt: string;
  observation: PolymarketPriceChangeObservation;
}

export function buildPolymarketPriceChangeObservationRows(
  change: PolymarketBinaryPriceChange,
): PolymarketPriceChangeObservationRow[] {
  return [
    {
      key: 'from-yes',
      boundary: 'Earlier',
      outcome: 'YES',
      requestedAt: change.requestedFrom,
      observation: change.outcomes.yes.observations.from,
    },
    {
      key: 'from-no',
      boundary: 'Earlier',
      outcome: 'NO',
      requestedAt: change.requestedFrom,
      observation: change.outcomes.no.observations.from,
    },
    {
      key: 'to-yes',
      boundary: 'Later',
      outcome: 'YES',
      requestedAt: change.requestedTo,
      observation: change.outcomes.yes.observations.to,
    },
    {
      key: 'to-no',
      boundary: 'Later',
      outcome: 'NO',
      requestedAt: change.requestedTo,
      observation: change.outcomes.no.observations.to,
    },
  ];
}
