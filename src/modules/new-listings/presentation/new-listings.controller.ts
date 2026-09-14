import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  DEFAULT_DETECTED_SPOT_SYMBOL_LIMIT,
  MAX_DETECTED_SPOT_SYMBOL_LIMIT,
  SpotSymbolDetectionReadModelService,
} from '../application/spot-symbol-detection-read-model.service';
import { DetectedSpotSymbol } from '../domain/spot-symbol-catalog';

@Controller('new-listings')
export class NewListingsController {
  constructor(
    private readonly detections: SpotSymbolDetectionReadModelService,
  ) {}

  @Get()
  list(
    @Query('limit') limit?: string,
    @Query('detectedFrom') detectedFrom?: string,
    @Query('detectedTo') detectedTo?: string,
  ): Promise<DetectedSpotSymbol[]> {
    const parsedLimit = validLimit(limit);
    const parsedFrom = optionalUtcTimestamp(detectedFrom, 'detectedFrom');
    const parsedTo = optionalUtcTimestamp(detectedTo, 'detectedTo');
    if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
      throw new BadRequestException(
        'detectedFrom must be at or before detectedTo',
      );
    }
    return this.detections.listRecent({
      limit: parsedLimit,
      detectedFrom: parsedFrom,
      detectedTo: parsedTo,
    });
  }
}

function validLimit(value?: string): number {
  if (value === undefined) return DEFAULT_DETECTED_SPOT_SYMBOL_LIMIT;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new BadRequestException('limit must be an integer from 1 to 100');
  }
  const parsed = Number(value);
  if (parsed > MAX_DETECTED_SPOT_SYMBOL_LIMIT) {
    throw new BadRequestException('limit must be an integer from 1 to 100');
  }
  return parsed;
}

function optionalUtcTimestamp(value: string | undefined, field: string) {
  if (value === undefined) return undefined;
  const parsed = new Date(value);
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString() !== value
  ) {
    throw new BadRequestException(`${field} must be an ISO 8601 UTC timestamp`);
  }
  return parsed;
}
