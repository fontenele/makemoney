import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import {
  DEFAULT_DETECTED_SPOT_SYMBOL_LIMIT,
  MAX_DETECTED_SPOT_SYMBOL_LIMIT,
  SpotSymbolDetectionReadModelService,
} from '../application/spot-symbol-detection-read-model.service';
import {
  DetectedSpotSymbol,
  DetectedSpotSymbolCursorNotFoundError,
} from '../domain/spot-symbol-catalog';

@Controller('new-listings')
export class NewListingsController {
  constructor(
    private readonly detections: SpotSymbolDetectionReadModelService,
  ) {}

  @Get()
  async list(
    @Query('limit') limit?: string,
    @Query('detectedFrom') detectedFrom?: string,
    @Query('detectedTo') detectedTo?: string,
    @Query('cursor') cursor?: string,
    @Query('provider') provider?: string,
    @Query('status') status?: string,
    @Query('spotTradingAllowed') spotTradingAllowed?: string,
  ): Promise<DetectedSpotSymbol[]> {
    const parsedLimit = validLimit(limit);
    const parsedFrom = optionalUtcTimestamp(detectedFrom, 'detectedFrom');
    const parsedTo = optionalUtcTimestamp(detectedTo, 'detectedTo');
    if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
      throw new BadRequestException(
        'detectedFrom must be at or before detectedTo',
      );
    }
    const parsedCursor = optionalCursor(cursor);
    const parsedProvider = optionalProvider(provider);
    const parsedStatus = optionalStatus(status);
    const parsedSpotTradingAllowed = optionalBoolean(
      spotTradingAllowed,
      'spotTradingAllowed',
    );
    try {
      return await this.detections.listRecent(
        {
          limit: parsedLimit,
          detectedFrom: parsedFrom,
          detectedTo: parsedTo,
          ...(parsedProvider ? { provider: parsedProvider } : {}),
          ...(parsedStatus ? { status: parsedStatus } : {}),
          ...(parsedSpotTradingAllowed !== undefined
            ? { spotTradingAllowed: parsedSpotTradingAllowed }
            : {}),
        },
        parsedCursor,
      );
    } catch (error) {
      if (error instanceof DetectedSpotSymbolCursorNotFoundError) {
        throw new BadRequestException('cursor must identify a detected symbol');
      }
      throw error;
    }
  }
}

function optionalProvider(value?: string) {
  if (value === undefined) return undefined;
  if (value !== 'binance') {
    throw new BadRequestException('provider must be binance');
  }
  return value;
}

function optionalStatus(value?: string) {
  if (value === undefined) return undefined;
  if (!/^[A-Z][A-Z0-9_]{0,29}$/.test(value)) {
    throw new BadRequestException(
      'status must be an uppercase provider status from 1 to 30 characters',
    );
  }
  return value;
}

function optionalBoolean(value: string | undefined, field: string) {
  if (value === undefined) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new BadRequestException(`${field} must be true or false`);
}

function optionalCursor(value?: string) {
  if (value === undefined) return undefined;
  const match = /^(binance):([A-Z0-9]{1,40})$/.exec(value);
  const symbol = match?.[2];
  if (!symbol) {
    throw new BadRequestException('cursor must use provider:symbol format');
  }
  return { provider: 'binance' as const, symbol };
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
