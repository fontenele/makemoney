import type { PredictionEventDetails } from './prediction-event';

export interface PredictionEventMarketLiveVolume {
  conditionId: string | null;
  takerVolumeShares: string;
}

export interface PredictionEventLiveVolumeObservation {
  provider: 'polymarket';
  eventId: string;
  takerVolumeTotalShares: string;
  markets: PredictionEventMarketLiveVolume[];
  source: 'data-api-live-volume';
  receivedAt: Date;
}

export interface PredictionEventLiveVolume {
  provider: 'polymarket';
  event: PredictionEventDetails;
  takerVolumeTotalShares: string;
  markets: PredictionEventMarketLiveVolume[];
  source: 'data-api-live-volume';
  receivedAt: Date;
  executable: false;
}

export const PREDICTION_EVENT_LIVE_VOLUME_PROVIDER = Symbol(
  'PREDICTION_EVENT_LIVE_VOLUME_PROVIDER',
);

export interface PredictionEventLiveVolumeProvider {
  getLiveVolume(
    eventId: string,
    signal?: AbortSignal,
  ): Promise<PredictionEventLiveVolumeObservation>;
}

export class PredictionEventLiveVolumeUnavailableError extends Error {
  constructor(eventId: string) {
    super(`Polymarket live volume for event ${eventId} is unavailable`);
    this.name = PredictionEventLiveVolumeUnavailableError.name;
  }
}

export class PredictionEventLiveVolumeIncoherentError extends Error {
  constructor(eventId: string) {
    super(`Polymarket live volume for event ${eventId} is incoherent`);
    this.name = PredictionEventLiveVolumeIncoherentError.name;
  }
}
