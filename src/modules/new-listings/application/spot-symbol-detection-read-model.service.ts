import { Inject, Injectable } from '@nestjs/common';
import {
  DetectedSpotSymbol,
  DetectedSpotSymbolQuery,
  SPOT_SYMBOL_REPOSITORY,
  SpotSymbolRepository,
} from '../domain/spot-symbol-catalog';

export const DEFAULT_DETECTED_SPOT_SYMBOL_LIMIT = 50;
export const MAX_DETECTED_SPOT_SYMBOL_LIMIT = 100;

@Injectable()
export class SpotSymbolDetectionReadModelService {
  constructor(
    @Inject(SPOT_SYMBOL_REPOSITORY)
    private readonly repository: SpotSymbolRepository,
  ) {}

  listRecent(query: DetectedSpotSymbolQuery): Promise<DetectedSpotSymbol[]> {
    return this.repository.listDetected(query);
  }
}
