import { Inject, Injectable } from '@nestjs/common';
import {
  DetectedSpotSymbolCursorNotFoundError,
  DetectedSpotSymbolNotFoundError,
  DetectedSpotSymbol,
  DetectedSpotSymbolFilters,
  DetectedSpotSymbolQuery,
  DetectedSpotSymbolSummary,
  SPOT_SYMBOL_REPOSITORY,
  SpotSymbolRepository,
} from '../domain/spot-symbol-catalog';
import { CompletedListingObservationCheckpoint } from '../domain/listing-observation-schedule';
import { ListingObservationPricePerformance } from '../domain/listing-observation-price-performance';
import { ListingObservationPricePerformanceCalculator } from './listing-observation-price-performance-calculator';
import { ListingObservationCohortPerformance } from '../domain/listing-observation-cohort-performance';
import { ListingObservationCohortPerformanceCalculator } from './listing-observation-cohort-performance-calculator';
import {
  ListingObservationPatternClassification,
  ListingObservationPatternThresholds,
} from '../domain/listing-observation-pattern-classification';
import {
  ListingObservationPatternClassifier,
  validateListingObservationPatternThresholds,
} from './listing-observation-pattern-classifier';
import { ListingObservationPatternCohort } from '../domain/listing-observation-pattern-cohort';
import { ListingObservationPatternCohortCalculator } from './listing-observation-pattern-cohort-calculator';

export const DEFAULT_DETECTED_SPOT_SYMBOL_LIMIT = 50;
export const MAX_DETECTED_SPOT_SYMBOL_LIMIT = 100;
export const MAX_LISTING_OBSERVATION_COHORT_LIMIT = 100;

@Injectable()
export class SpotSymbolDetectionReadModelService {
  private readonly pricePerformance =
    new ListingObservationPricePerformanceCalculator();
  private readonly cohortPerformance =
    new ListingObservationCohortPerformanceCalculator();
  private readonly patternClassifier =
    new ListingObservationPatternClassifier();
  private readonly patternCohort =
    new ListingObservationPatternCohortCalculator();

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

  summarize(
    filters: DetectedSpotSymbolFilters,
  ): Promise<DetectedSpotSymbolSummary> {
    return this.repository.summarizeDetected(filters);
  }

  async listObservations(
    provider: 'binance',
    symbol: string,
  ): Promise<CompletedListingObservationCheckpoint[]> {
    if (!(await this.repository.findDetected(provider, symbol))) {
      throw new DetectedSpotSymbolNotFoundError();
    }
    return this.repository.listCompletedObservations(provider, symbol);
  }

  async getPricePerformance(
    provider: 'binance',
    symbol: string,
  ): Promise<ListingObservationPricePerformance | null> {
    return this.pricePerformance.calculate(
      await this.listObservations(provider, symbol),
    );
  }

  async getCohortPerformance(
    provider: 'binance',
    limit: number,
  ): Promise<ListingObservationCohortPerformance> {
    this.validateCohortLimit(limit);
    const timelines = await this.repository.listCompletedObservationCohort(
      provider,
      limit,
    );
    return this.cohortPerformance.calculate(
      timelines.map((timeline) => {
        const performance = this.pricePerformance.calculate(timeline);
        if (!performance) {
          throw new Error('Cohort timeline must include completed T+0');
        }
        return performance;
      }),
    );
  }

  async getPatternClassification(
    provider: 'binance',
    symbol: string,
    thresholds: ListingObservationPatternThresholds,
  ): Promise<ListingObservationPatternClassification | null> {
    const performance = await this.getPricePerformance(provider, symbol);
    return performance
      ? this.patternClassifier.classify(performance, thresholds)
      : null;
  }

  async getPatternCohort(
    provider: 'binance',
    limit: number,
    thresholds: ListingObservationPatternThresholds,
  ): Promise<ListingObservationPatternCohort> {
    this.validateCohortLimit(limit);
    validateListingObservationPatternThresholds(thresholds);
    const timelines = await this.repository.listCompletedObservationCohort(
      provider,
      limit,
    );
    return this.patternCohort.calculate(
      timelines.map((timeline) => {
        const performance = this.pricePerformance.calculate(timeline);
        if (!performance) {
          throw new Error('Cohort timeline must include completed T+0');
        }
        return this.patternClassifier.classify(performance, thresholds);
      }),
    );
  }

  private validateCohortLimit(limit: number): void {
    if (
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > MAX_LISTING_OBSERVATION_COHORT_LIMIT
    ) {
      throw new Error(
        `Listing observation cohort limit must be an integer from 1 to ${MAX_LISTING_OBSERVATION_COHORT_LIMIT}`,
      );
    }
  }
}
