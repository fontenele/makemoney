import { Inject, Injectable } from '@nestjs/common';
import {
  PREDICTION_SERIES_PROVIDER,
  PredictionSeriesDetails,
  PredictionSeriesEvents,
  PredictionSeriesPage,
  PredictionSeriesProvider,
  PredictionSeriesQuery,
} from '../domain/prediction-series';

@Injectable()
export class PredictionSeriesService {
  constructor(
    @Inject(PREDICTION_SERIES_PROVIDER)
    private readonly provider: PredictionSeriesProvider,
  ) {}

  listActive(
    query: PredictionSeriesQuery,
    signal?: AbortSignal,
  ): Promise<PredictionSeriesPage> {
    return this.provider.listActive(query, signal);
  }

  getById(id: string, signal?: AbortSignal): Promise<PredictionSeriesDetails> {
    return this.provider.getById(id, signal);
  }

  getEventsById(
    id: string,
    signal?: AbortSignal,
  ): Promise<PredictionSeriesEvents> {
    return this.provider.getEventsById(id, signal);
  }
}
