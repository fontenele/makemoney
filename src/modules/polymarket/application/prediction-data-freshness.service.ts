import { Inject, Injectable } from '@nestjs/common';
import {
  PREDICTION_DATA_FRESHNESS_PROVIDER,
  PredictionDataFreshnessObservation,
  PredictionDataFreshnessProvider,
} from '../domain/prediction-data-freshness';

@Injectable()
export class PredictionDataFreshnessService {
  constructor(
    @Inject(PREDICTION_DATA_FRESHNESS_PROVIDER)
    private readonly provider: PredictionDataFreshnessProvider,
  ) {}

  getFreshness(
    signal?: AbortSignal,
  ): Promise<PredictionDataFreshnessObservation> {
    return this.provider.getFreshness(signal);
  }
}
