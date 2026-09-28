import { Inject, Injectable } from '@nestjs/common';
import {
  PREDICTION_EVENT_LIVE_VOLUME_PROVIDER,
  PredictionEventLiveVolume,
  PredictionEventLiveVolumeIncoherentError,
  PredictionEventLiveVolumeProvider,
} from '../domain/prediction-event-live-volume';
import { PredictionEventService } from './prediction-event.service';

@Injectable()
export class PredictionEventLiveVolumeService {
  constructor(
    private readonly events: PredictionEventService,
    @Inject(PREDICTION_EVENT_LIVE_VOLUME_PROVIDER)
    private readonly provider: PredictionEventLiveVolumeProvider,
  ) {}

  async getLiveVolume(
    eventId: string,
    signal?: AbortSignal,
  ): Promise<PredictionEventLiveVolume> {
    const event = await this.events.getById(eventId, signal);
    const observation = await this.provider.getLiveVolume(eventId, signal);
    if (observation.eventId !== event.id) {
      throw new PredictionEventLiveVolumeIncoherentError(eventId);
    }
    const knownConditions = new Set(
      event.markets.flatMap((market) =>
        market.conditionId === null ? [] : [market.conditionId.toLowerCase()],
      ),
    );
    if (
      observation.markets.some(
        (market) =>
          market.conditionId !== null &&
          !knownConditions.has(market.conditionId.toLowerCase()),
      )
    ) {
      throw new PredictionEventLiveVolumeIncoherentError(eventId);
    }
    return {
      provider: 'polymarket',
      event,
      takerVolumeTotalShares: observation.takerVolumeTotalShares,
      markets: observation.markets,
      source: observation.source,
      receivedAt: observation.receivedAt,
      executable: false,
    };
  }
}
