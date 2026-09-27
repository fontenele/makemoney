import { Inject, Injectable } from '@nestjs/common';
import {
  ActivePredictionEventQuery,
  PREDICTION_EVENT_PROVIDER,
  PredictionEventDetails,
  PredictionEventPage,
  PredictionEventProvider,
  PredictionEventTags,
} from '../domain/prediction-event';

@Injectable()
export class PredictionEventService {
  constructor(
    @Inject(PREDICTION_EVENT_PROVIDER)
    private readonly provider: PredictionEventProvider,
  ) {}

  listActive(
    query: ActivePredictionEventQuery,
    signal?: AbortSignal,
  ): Promise<PredictionEventPage> {
    return this.provider.listActive(query, signal);
  }

  getById(id: string, signal?: AbortSignal): Promise<PredictionEventDetails> {
    return this.provider.getById(id, signal);
  }

  getTagsById(id: string, signal?: AbortSignal): Promise<PredictionEventTags> {
    return this.provider.getTagsById(id, signal);
  }
}
