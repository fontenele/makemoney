import {
  BadRequestException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  DEFAULT_DETECTED_SPOT_SYMBOL_LIMIT,
  MAX_LISTING_OBSERVATION_COHORT_LIMIT,
  MAX_DETECTED_SPOT_SYMBOL_LIMIT,
  SpotSymbolDetectionReadModelService,
} from '../application/spot-symbol-detection-read-model.service';
import {
  DetectedSpotSymbol,
  DetectedSpotSymbolCursorNotFoundError,
  DetectedSpotSymbolFilters,
  DetectedSpotSymbolNotFoundError,
  DetectedSpotSymbolSummary,
} from '../domain/spot-symbol-catalog';
import { CompletedListingObservationCheckpoint } from '../domain/listing-observation-schedule';
import { ListingObservationPricePerformance } from '../domain/listing-observation-price-performance';
import { ListingObservationCohortPerformance } from '../domain/listing-observation-cohort-performance';
import {
  ListingObservationPatternClassification,
  ListingObservationPatternThresholds,
} from '../domain/listing-observation-pattern-classification';
import { validateListingObservationPatternThresholds } from '../application/listing-observation-pattern-classifier';
import { ListingObservationPatternCohort } from '../domain/listing-observation-pattern-cohort';
import { ListingObservationPatternMagnitudeCohort } from '../domain/listing-observation-pattern-magnitude-cohort';
import { ListingObservationPatternTimingCohort } from '../domain/listing-observation-pattern-timing-cohort';
import { ListingObservationMarketActivityCohort } from '../domain/listing-observation-market-activity-cohort';
import { StoredListingTopOfBookCheckpoint } from '../domain/listing-top-of-book-observation-repository';

@Controller('new-listings')
export class NewListingsController {
  constructor(
    private readonly detections: SpotSymbolDetectionReadModelService,
  ) {}

  @Get('performance')
  cohortPerformance(
    @Query('limit') limit?: string,
    @Query('provider') provider?: string,
  ): Promise<ListingObservationCohortPerformance> {
    return this.detections.getCohortPerformance(
      optionalProvider(provider) ?? 'binance',
      validLimit(limit, MAX_LISTING_OBSERVATION_COHORT_LIMIT),
    );
  }

  @Get('activity')
  marketActivityCohort(
    @Query('limit') limit?: string,
    @Query('provider') provider?: string,
  ): Promise<ListingObservationMarketActivityCohort> {
    return this.detections.getMarketActivityCohort(
      optionalProvider(provider) ?? 'binance',
      validLimit(limit, MAX_LISTING_OBSERVATION_COHORT_LIMIT),
    );
  }

  @Get('classification')
  patternCohort(
    @Query('limit') limit?: string,
    @Query('provider') provider?: string,
    @Query('pumpReturnRate') pumpReturnRate?: string,
    @Query('correctionFromPeakRate') correctionFromPeakRate?: string,
  ): Promise<ListingObservationPatternCohort> {
    return this.detections.getPatternCohort(
      optionalProvider(provider) ?? 'binance',
      validLimit(limit, MAX_LISTING_OBSERVATION_COHORT_LIMIT),
      validPatternThresholds(pumpReturnRate, correctionFromPeakRate),
    );
  }

  @Get('classification/magnitudes')
  patternMagnitudeCohort(
    @Query('limit') limit?: string,
    @Query('provider') provider?: string,
    @Query('pumpReturnRate') pumpReturnRate?: string,
    @Query('correctionFromPeakRate') correctionFromPeakRate?: string,
  ): Promise<ListingObservationPatternMagnitudeCohort> {
    return this.detections.getPatternMagnitudeCohort(
      optionalProvider(provider) ?? 'binance',
      validLimit(limit, MAX_LISTING_OBSERVATION_COHORT_LIMIT),
      validPatternThresholds(pumpReturnRate, correctionFromPeakRate),
    );
  }

  @Get('classification/timing')
  patternTimingCohort(
    @Query('limit') limit?: string,
    @Query('provider') provider?: string,
    @Query('pumpReturnRate') pumpReturnRate?: string,
    @Query('correctionFromPeakRate') correctionFromPeakRate?: string,
  ): Promise<ListingObservationPatternTimingCohort> {
    return this.detections.getPatternTimingCohort(
      optionalProvider(provider) ?? 'binance',
      validLimit(limit, MAX_LISTING_OBSERVATION_COHORT_LIMIT),
      validPatternThresholds(pumpReturnRate, correctionFromPeakRate),
    );
  }

  @Get(':provider/:symbol/performance')
  async performance(
    @Param('provider') provider: string,
    @Param('symbol') symbol: string,
  ): Promise<ListingObservationPricePerformance> {
    const identity = validObservationIdentity(provider, symbol);
    try {
      const result = await this.detections.getPricePerformance(
        identity.provider,
        identity.symbol,
      );
      if (!result) {
        throw new ServiceUnavailableException(
          'T+0 listing observation is not available',
        );
      }
      return result;
    } catch (error) {
      if (error instanceof DetectedSpotSymbolNotFoundError) {
        throw new NotFoundException('detected symbol was not found');
      }
      throw error;
    }
  }

  @Get(':provider/:symbol/classification')
  async classification(
    @Param('provider') provider: string,
    @Param('symbol') symbol: string,
    @Query('pumpReturnRate') pumpReturnRate?: string,
    @Query('correctionFromPeakRate') correctionFromPeakRate?: string,
  ): Promise<ListingObservationPatternClassification> {
    const identity = validObservationIdentity(provider, symbol);
    const thresholds = validPatternThresholds(
      pumpReturnRate,
      correctionFromPeakRate,
    );
    try {
      const result = await this.detections.getPatternClassification(
        identity.provider,
        identity.symbol,
        thresholds,
      );
      if (!result) {
        throw new ServiceUnavailableException(
          'T+0 listing observation is not available',
        );
      }
      return result;
    } catch (error) {
      if (error instanceof DetectedSpotSymbolNotFoundError) {
        throw new NotFoundException('detected symbol was not found');
      }
      throw error;
    }
  }

  @Get(':provider/:symbol/observations')
  async observations(
    @Param('provider') provider: string,
    @Param('symbol') symbol: string,
  ): Promise<CompletedListingObservationCheckpoint[]> {
    const identity = validObservationIdentity(provider, symbol);
    try {
      return await this.detections.listObservations(
        identity.provider,
        identity.symbol,
      );
    } catch (error) {
      if (error instanceof DetectedSpotSymbolNotFoundError) {
        throw new NotFoundException('detected symbol was not found');
      }
      throw error;
    }
  }

  @Get(':provider/:symbol/top-of-book')
  async topOfBook(
    @Param('provider') provider: string,
    @Param('symbol') symbol: string,
  ): Promise<StoredListingTopOfBookCheckpoint[]> {
    const identity = validObservationIdentity(provider, symbol);
    try {
      return await this.detections.listTopOfBook(
        identity.provider,
        identity.symbol,
      );
    } catch (error) {
      if (error instanceof DetectedSpotSymbolNotFoundError) {
        throw new NotFoundException('detected symbol was not found');
      }
      throw error;
    }
  }

  @Get('summary')
  summary(
    @Query('detectedFrom') detectedFrom?: string,
    @Query('detectedTo') detectedTo?: string,
    @Query('provider') provider?: string,
    @Query('status') status?: string,
    @Query('spotTradingAllowed') spotTradingAllowed?: string,
  ): Promise<DetectedSpotSymbolSummary> {
    return this.detections.summarize(
      validFilters(
        detectedFrom,
        detectedTo,
        provider,
        status,
        spotTradingAllowed,
      ),
    );
  }

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
    const parsedCursor = optionalCursor(cursor);
    const filters = validFilters(
      detectedFrom,
      detectedTo,
      provider,
      status,
      spotTradingAllowed,
    );
    try {
      return await this.detections.listRecent(
        {
          limit: parsedLimit,
          ...filters,
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

function validObservationIdentity(provider: string, symbol: string) {
  const parsedProvider = optionalProvider(provider);
  if (!parsedProvider || !/^[A-Z0-9]{1,30}$/.test(symbol)) {
    throw new BadRequestException(
      'symbol must be an uppercase provider symbol from 1 to 30 characters',
    );
  }
  return { provider: parsedProvider, symbol };
}

function validPatternThresholds(
  pumpReturnRate?: string,
  correctionFromPeakRate?: string,
): ListingObservationPatternThresholds {
  if (pumpReturnRate === undefined || correctionFromPeakRate === undefined) {
    throw new BadRequestException(
      'pumpReturnRate and correctionFromPeakRate are required',
    );
  }
  const thresholds = { pumpReturnRate, correctionFromPeakRate };
  try {
    validateListingObservationPatternThresholds(thresholds);
  } catch (error) {
    throw new BadRequestException(
      error instanceof Error ? error.message : 'invalid pattern thresholds',
    );
  }
  return thresholds;
}

function validFilters(
  detectedFrom?: string,
  detectedTo?: string,
  provider?: string,
  status?: string,
  spotTradingAllowed?: string,
): DetectedSpotSymbolFilters {
  const parsedFrom = optionalUtcTimestamp(detectedFrom, 'detectedFrom');
  const parsedTo = optionalUtcTimestamp(detectedTo, 'detectedTo');
  if (parsedFrom && parsedTo && parsedFrom > parsedTo) {
    throw new BadRequestException(
      'detectedFrom must be at or before detectedTo',
    );
  }
  const parsedProvider = optionalProvider(provider);
  const parsedStatus = optionalStatus(status);
  const parsedSpotTradingAllowed = optionalBoolean(
    spotTradingAllowed,
    'spotTradingAllowed',
  );
  return {
    detectedFrom: parsedFrom,
    detectedTo: parsedTo,
    ...(parsedProvider ? { provider: parsedProvider } : {}),
    ...(parsedStatus ? { status: parsedStatus } : {}),
    ...(parsedSpotTradingAllowed !== undefined
      ? { spotTradingAllowed: parsedSpotTradingAllowed }
      : {}),
  };
}

function optionalProvider(value?: string): 'binance' | undefined {
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

function validLimit(
  value?: string,
  maximum = MAX_DETECTED_SPOT_SYMBOL_LIMIT,
): number {
  if (value === undefined) return DEFAULT_DETECTED_SPOT_SYMBOL_LIMIT;
  if (!/^[1-9]\d*$/.test(value)) {
    throw new BadRequestException('limit must be an integer from 1 to 100');
  }
  const parsed = Number(value);
  if (parsed > maximum) {
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
