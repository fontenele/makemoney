import { Inject, Injectable } from '@nestjs/common';
import {
  PREDICTION_GLOBAL_OPEN_INTEREST_PROVIDER,
  PredictionGlobalOpenInterest,
  PredictionGlobalOpenInterestProvider,
} from '../domain/prediction-market-open-interest';

@Injectable()
export class PredictionGlobalOpenInterestService {
  constructor(
    @Inject(PREDICTION_GLOBAL_OPEN_INTEREST_PROVIDER)
    private readonly provider: PredictionGlobalOpenInterestProvider,
  ) {}

  getGlobalOpenInterest(
    signal?: AbortSignal,
  ): Promise<PredictionGlobalOpenInterest> {
    return this.provider.getGlobalOpenInterest(signal);
  }
}
