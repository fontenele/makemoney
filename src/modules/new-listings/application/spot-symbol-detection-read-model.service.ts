import { Inject, Injectable } from '@nestjs/common';
import {
  DetectedSpotSymbolCursorNotFoundError,
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

  async listRecent(
    query: Omit<DetectedSpotSymbolQuery, 'cursor'>,
    cursor?: { provider: 'binance'; symbol: string },
  ): Promise<DetectedSpotSymbol[]> {
    const resolvedCursor = cursor
      ? await this.repository.findDetected(cursor.provider, cursor.symbol)
      : undefined;
    if (cursor && !resolvedCursor) {
      throw new DetectedSpotSymbolCursorNotFoundError();
    }
    if (
      resolvedCursor &&
      ((query.detectedFrom && resolvedCursor.detectedAt < query.detectedFrom) ||
        (query.detectedTo && resolvedCursor.detectedAt > query.detectedTo) ||
        (query.provider && resolvedCursor.provider !== query.provider) ||
        (query.status && resolvedCursor.status !== query.status) ||
        (query.spotTradingAllowed !== undefined &&
          resolvedCursor.spotTradingAllowed !== query.spotTradingAllowed))
    ) {
      throw new DetectedSpotSymbolCursorNotFoundError();
    }
    return this.repository.listDetected({
      ...query,
      cursor: resolvedCursor ?? undefined,
    });
  }
}
