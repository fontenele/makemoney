import { Inject, Injectable } from '@nestjs/common';
import {
  PREDICTION_SEARCH_PROVIDER,
  PredictionSearchProvider,
  PredictionSearchQuery,
  PredictionSearchResult,
} from '../domain/prediction-search';

@Injectable()
export class PredictionSearchService {
  constructor(
    @Inject(PREDICTION_SEARCH_PROVIDER)
    private readonly provider: PredictionSearchProvider,
  ) {}

  searchActiveEvents(
    query: PredictionSearchQuery,
    signal?: AbortSignal,
  ): Promise<PredictionSearchResult> {
    return this.provider.searchActiveEvents(query, signal);
  }
}
