export const LISTING_OBSERVATION_CHECKPOINTS = [
  { label: 'T+0', offsetMs: 0 },
  { label: 'T+5s', offsetMs: 5_000 },
  { label: 'T+10s', offsetMs: 10_000 },
  { label: 'T+30s', offsetMs: 30_000 },
  { label: 'T+1m', offsetMs: 60_000 },
  { label: 'T+5m', offsetMs: 5 * 60_000 },
  { label: 'T+15m', offsetMs: 15 * 60_000 },
  { label: 'T+1h', offsetMs: 60 * 60_000 },
  { label: 'T+24h', offsetMs: 24 * 60 * 60_000 },
] as const;

export type ListingObservationCheckpointLabel =
  (typeof LISTING_OBSERVATION_CHECKPOINTS)[number]['label'];

export interface ListingObservationCheckpoint {
  label: ListingObservationCheckpointLabel;
  offsetMs: number;
  targetAt: Date;
}

export interface DueListingObservationCheckpoint extends ListingObservationCheckpoint {
  provider: 'binance';
  symbol: string;
}

export function buildListingObservationSchedule(
  detectedAt: Date,
): ListingObservationCheckpoint[] {
  const detectedAtMs = detectedAt.getTime();
  if (!Number.isFinite(detectedAtMs)) {
    throw new Error('Detection time must be valid');
  }

  return LISTING_OBSERVATION_CHECKPOINTS.map(({ label, offsetMs }) => {
    const targetAt = new Date(detectedAtMs + offsetMs);
    if (!Number.isFinite(targetAt.getTime())) {
      throw new Error('Observation checkpoint time is out of range');
    }
    return { label, offsetMs, targetAt };
  });
}
