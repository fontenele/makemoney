export interface PredictionDataFreshnessLaggingCursor {
  behindMax: number;
  block: number;
  source: string;
}

export interface PredictionDataFreshnessMechanism {
  ageSeconds: number;
  name: string;
  blocksBehind: number;
}

export interface PredictionDataFreshnessObservation {
  provider: 'polymarket';
  snapshotAgeSeconds: number;
  computedAt: string;
  ingestion: {
    chainId: number;
    cursorCount: number;
    lagging: PredictionDataFreshnessLaggingCursor[];
    maxSyncedBlock: number;
    minSyncedBlock: number;
    mostLagged: PredictionDataFreshnessLaggingCursor;
    network: string;
  };
  serving: {
    mechanisms: PredictionDataFreshnessMechanism[];
    lagSeconds: number;
    worst: string;
  };
  source: 'data-api-status';
  receivedAt: Date;
}

export const PREDICTION_DATA_FRESHNESS_PROVIDER = Symbol(
  'PREDICTION_DATA_FRESHNESS_PROVIDER',
);

export interface PredictionDataFreshnessProvider {
  getFreshness(
    signal?: AbortSignal,
  ): Promise<PredictionDataFreshnessObservation>;
}
