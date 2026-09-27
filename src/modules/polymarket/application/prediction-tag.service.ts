import { Inject, Injectable } from '@nestjs/common';
import {
  PREDICTION_TAG_PROVIDER,
  PredictionTagDetails,
  PredictionTagPage,
  PredictionTagProvider,
  PredictionTagQuery,
} from '../domain/prediction-tag';

@Injectable()
export class PredictionTagService {
  constructor(
    @Inject(PREDICTION_TAG_PROVIDER)
    private readonly provider: PredictionTagProvider,
  ) {}

  list(
    query: PredictionTagQuery,
    signal?: AbortSignal,
  ): Promise<PredictionTagPage> {
    return this.provider.list(query, signal);
  }

  getById(id: string, signal?: AbortSignal): Promise<PredictionTagDetails> {
    return this.provider.getById(id, signal);
  }
}
