import { Inject, Injectable, Optional } from '@nestjs/common';
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
import { ListingObservationPricePathStatistics } from '../domain/listing-observation-price-path-statistics';
import { ListingObservationPricePathStatisticsCalculator } from './listing-observation-price-path-statistics-calculator';
import { ListingObservationPricePathCohort } from '../domain/listing-observation-price-path-cohort';
import { ListingObservationPricePathCohortCalculator } from './listing-observation-price-path-cohort-calculator';
import { ListingObservationPriceVariability } from '../domain/listing-observation-price-variability';
import { ListingObservationPriceVariabilityCalculator } from './listing-observation-price-variability-calculator';
import { ListingObservationPriceVariabilityCohort } from '../domain/listing-observation-price-variability-cohort';
import { ListingObservationPriceVariabilityCohortCalculator } from './listing-observation-price-variability-cohort-calculator';
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
import { ListingObservationPatternMagnitudeCohort } from '../domain/listing-observation-pattern-magnitude-cohort';
import { ListingObservationPatternMagnitudeCohortCalculator } from './listing-observation-pattern-magnitude-cohort-calculator';
import { ListingObservationPatternTimingCohort } from '../domain/listing-observation-pattern-timing-cohort';
import { ListingObservationPatternTimingCohortCalculator } from './listing-observation-pattern-timing-cohort-calculator';
import { ListingObservationMarketActivityCohort } from '../domain/listing-observation-market-activity-cohort';
import { ListingObservationMarketActivityCohortCalculator } from './listing-observation-market-activity-cohort-calculator';
import {
  LISTING_TOP_OF_BOOK_OBSERVATION_REPOSITORY,
  ListingTopOfBookObservationRepository,
  StoredListingTopOfBookCheckpoint,
} from '../domain/listing-top-of-book-observation-repository';
import { ListingTopOfBookCohort } from '../domain/listing-top-of-book-cohort';
import { ListingTopOfBookCohortCalculator } from './listing-top-of-book-cohort-calculator';
import { StoredListingTopOfBookImbalance } from '../domain/listing-top-of-book-imbalance';
import { ListingTopOfBookImbalanceCalculator } from './listing-top-of-book-imbalance-calculator';
import { ListingTopOfBookImbalanceCohort } from '../domain/listing-top-of-book-imbalance-cohort';
import { ListingTopOfBookImbalanceCohortCalculator } from './listing-top-of-book-imbalance-cohort-calculator';
import { ListingTopOfBookImbalanceEvolution } from '../domain/listing-top-of-book-imbalance-evolution';
import { ListingTopOfBookImbalanceEvolutionCohort } from '../domain/listing-top-of-book-imbalance-evolution-cohort';
import { ListingTopOfBookImbalanceEvolutionCalculator } from './listing-top-of-book-imbalance-evolution-calculator';
import { ListingTopOfBookImbalanceEvolutionCohortCalculator } from './listing-top-of-book-imbalance-evolution-cohort-calculator';
import { ListingTopOfBookSpreadEvolution } from '../domain/listing-top-of-book-spread-evolution';
import { ListingTopOfBookSpreadEvolutionCalculator } from './listing-top-of-book-spread-evolution-calculator';
import { ListingTopOfBookSpreadEvolutionCohort } from '../domain/listing-top-of-book-spread-evolution-cohort';
import { ListingTopOfBookSpreadEvolutionCohortCalculator } from './listing-top-of-book-spread-evolution-cohort-calculator';
import {
  ListingTopOfBookSpreadClassification,
  ListingTopOfBookSpreadThresholds,
} from '../domain/listing-top-of-book-spread-classification';
import {
  ListingTopOfBookSpreadClassifier,
  validateListingTopOfBookSpreadThresholds,
} from './listing-top-of-book-spread-classifier';
import { ListingTopOfBookSpreadClassificationCohort } from '../domain/listing-top-of-book-spread-classification-cohort';
import { ListingTopOfBookSpreadClassificationCohortCalculator } from './listing-top-of-book-spread-classification-cohort-calculator';
import { ListingTopOfBookSpreadClassificationMagnitudeCohort } from '../domain/listing-top-of-book-spread-classification-magnitude-cohort';
import { ListingTopOfBookSpreadClassificationMagnitudeCohortCalculator } from './listing-top-of-book-spread-classification-magnitude-cohort-calculator';
import { ListingTopOfBookSpreadClassificationTimingCohort } from '../domain/listing-top-of-book-spread-classification-timing-cohort';
import { ListingTopOfBookSpreadClassificationTimingCohortCalculator } from './listing-top-of-book-spread-classification-timing-cohort-calculator';
import {
  ListingCheckpointRoundTrip,
  ListingCheckpointRoundTripSelection,
} from '../domain/listing-checkpoint-round-trip';
import {
  ListingCheckpointRoundTripCalculator,
  validateListingCheckpointRoundTripSelection,
} from './listing-checkpoint-round-trip-calculator';
import {
  ListingCheckpointRoundTripCohort,
  ListingCheckpointRoundTripCohortSample,
} from '../domain/listing-checkpoint-round-trip-cohort';
import { ListingCheckpointRoundTripCohortCalculator } from './listing-checkpoint-round-trip-cohort-calculator';
import { ListingCheckpointRoundTripOutcomeCohort } from '../domain/listing-checkpoint-round-trip-outcome-cohort';
import { ListingCheckpointRoundTripOutcomeCohortCalculator } from './listing-checkpoint-round-trip-outcome-cohort-calculator';

export const DEFAULT_DETECTED_SPOT_SYMBOL_LIMIT = 50;
export const MAX_DETECTED_SPOT_SYMBOL_LIMIT = 100;
export const MAX_LISTING_OBSERVATION_COHORT_LIMIT = 100;

@Injectable()
export class SpotSymbolDetectionReadModelService {
  private readonly pricePerformance =
    new ListingObservationPricePerformanceCalculator();
  private readonly pricePathStatistics =
    new ListingObservationPricePathStatisticsCalculator();
  private readonly pricePathCohort =
    new ListingObservationPricePathCohortCalculator();
  private readonly priceVariability =
    new ListingObservationPriceVariabilityCalculator();
  private readonly priceVariabilityCohort =
    new ListingObservationPriceVariabilityCohortCalculator();
  private readonly cohortPerformance =
    new ListingObservationCohortPerformanceCalculator();
  private readonly patternClassifier =
    new ListingObservationPatternClassifier();
  private readonly patternCohort =
    new ListingObservationPatternCohortCalculator();
  private readonly patternMagnitudeCohort =
    new ListingObservationPatternMagnitudeCohortCalculator();
  private readonly patternTimingCohort =
    new ListingObservationPatternTimingCohortCalculator();
  private readonly marketActivityCohort =
    new ListingObservationMarketActivityCohortCalculator();
  private readonly topOfBookCohort = new ListingTopOfBookCohortCalculator();
  private readonly topOfBookImbalance =
    new ListingTopOfBookImbalanceCalculator();
  private readonly topOfBookImbalanceCohort =
    new ListingTopOfBookImbalanceCohortCalculator();
  private readonly topOfBookImbalanceEvolution =
    new ListingTopOfBookImbalanceEvolutionCalculator();
  private readonly topOfBookImbalanceEvolutionCohort =
    new ListingTopOfBookImbalanceEvolutionCohortCalculator();
  private readonly topOfBookSpreadEvolution =
    new ListingTopOfBookSpreadEvolutionCalculator();
  private readonly topOfBookSpreadEvolutionCohort =
    new ListingTopOfBookSpreadEvolutionCohortCalculator();
  private readonly topOfBookSpreadClassifier =
    new ListingTopOfBookSpreadClassifier();
  private readonly topOfBookSpreadClassificationCohort =
    new ListingTopOfBookSpreadClassificationCohortCalculator();
  private readonly topOfBookSpreadClassificationMagnitudeCohort =
    new ListingTopOfBookSpreadClassificationMagnitudeCohortCalculator();
  private readonly topOfBookSpreadClassificationTimingCohort =
    new ListingTopOfBookSpreadClassificationTimingCohortCalculator();
  private readonly checkpointRoundTrip =
    new ListingCheckpointRoundTripCalculator();
  private readonly checkpointRoundTripCohort =
    new ListingCheckpointRoundTripCohortCalculator();
  private readonly checkpointRoundTripOutcomeCohort =
    new ListingCheckpointRoundTripOutcomeCohortCalculator();

  constructor(
    @Inject(SPOT_SYMBOL_REPOSITORY)
    private readonly repository: SpotSymbolRepository,
    @Optional()
    @Inject(LISTING_TOP_OF_BOOK_OBSERVATION_REPOSITORY)
    private readonly topOfBookRepository?: ListingTopOfBookObservationRepository,
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

  async listTopOfBook(
    provider: 'binance',
    symbol: string,
  ): Promise<StoredListingTopOfBookCheckpoint[]> {
    if (!(await this.repository.findDetected(provider, symbol))) {
      throw new DetectedSpotSymbolNotFoundError();
    }
    if (!this.topOfBookRepository) {
      throw new Error('Listing top-of-book repository is unavailable');
    }
    return this.topOfBookRepository.listForDetection(provider, symbol);
  }

  async listTopOfBookImbalance(
    provider: 'binance',
    symbol: string,
  ): Promise<StoredListingTopOfBookImbalance[]> {
    return (await this.listTopOfBook(provider, symbol)).map((checkpoint) => ({
      label: checkpoint.label,
      offsetMs: checkpoint.offsetMs,
      targetAt: checkpoint.targetAt,
      ...this.topOfBookImbalance.calculate(checkpoint),
    }));
  }

  async getCheckpointRoundTrip(
    provider: 'binance',
    symbol: string,
    selection: ListingCheckpointRoundTripSelection,
  ): Promise<ListingCheckpointRoundTrip | null> {
    validateListingCheckpointRoundTripSelection(selection);
    const timeline = await this.listTopOfBook(provider, symbol);
    const entry = timeline.find(
      (checkpoint) => checkpoint.label === selection.entryLabel,
    );
    const exit = timeline.find(
      (checkpoint) => checkpoint.label === selection.exitLabel,
    );
    if (!entry || !exit) {
      return null;
    }
    return this.checkpointRoundTrip.calculate(entry, exit, selection);
  }

  async getTopOfBookImbalanceEvolution(
    provider: 'binance',
    symbol: string,
  ): Promise<ListingTopOfBookImbalanceEvolution | null> {
    return this.topOfBookImbalanceEvolution.calculate(
      await this.listTopOfBook(provider, symbol),
    );
  }

  async getTopOfBookSpreadEvolution(
    provider: 'binance',
    symbol: string,
  ): Promise<ListingTopOfBookSpreadEvolution | null> {
    return this.topOfBookSpreadEvolution.calculate(
      await this.listTopOfBook(provider, symbol),
    );
  }

  async getTopOfBookSpreadClassification(
    provider: 'binance',
    symbol: string,
    thresholds: ListingTopOfBookSpreadThresholds,
  ): Promise<ListingTopOfBookSpreadClassification | null> {
    validateListingTopOfBookSpreadThresholds(thresholds);
    const evolution = await this.getTopOfBookSpreadEvolution(provider, symbol);
    return evolution
      ? this.topOfBookSpreadClassifier.classify(evolution, thresholds)
      : null;
  }

  async getPricePerformance(
    provider: 'binance',
    symbol: string,
  ): Promise<ListingObservationPricePerformance | null> {
    return this.pricePerformance.calculate(
      await this.listObservations(provider, symbol),
    );
  }

  async getPricePathStatistics(
    provider: 'binance',
    symbol: string,
  ): Promise<ListingObservationPricePathStatistics | null> {
    return this.pricePathStatistics.calculate(
      await this.listObservations(provider, symbol),
    );
  }

  async getPriceVariability(
    provider: 'binance',
    symbol: string,
  ): Promise<ListingObservationPriceVariability | null> {
    return this.priceVariability.calculate(
      await this.listObservations(provider, symbol),
    );
  }

  async getPricePathCohort(
    provider: 'binance',
    limit: number,
  ): Promise<ListingObservationPricePathCohort> {
    this.validateCohortLimit(limit);
    const timelines = await this.repository.listCompletedObservationCohort(
      provider,
      limit,
    );
    return this.pricePathCohort.calculate(
      timelines.map((timeline) => {
        const statistics = this.pricePathStatistics.calculate(timeline);
        if (!statistics) {
          throw new Error('Cohort timeline must include completed T+0');
        }
        return statistics;
      }),
    );
  }

  async getPriceVariabilityCohort(
    provider: 'binance',
    limit: number,
  ): Promise<ListingObservationPriceVariabilityCohort> {
    this.validateCohortLimit(limit);
    const timelines = await this.repository.listCompletedObservationCohort(
      provider,
      limit,
    );
    return this.priceVariabilityCohort.calculate(
      timelines.map((timeline) => {
        const variability = this.priceVariability.calculate(timeline);
        if (!variability) {
          throw new Error('Cohort timeline must include completed T+0');
        }
        return variability;
      }),
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
    return this.patternCohort.calculate(
      await this.loadPatternClassifications(provider, limit, thresholds),
    );
  }

  async getPatternMagnitudeCohort(
    provider: 'binance',
    limit: number,
    thresholds: ListingObservationPatternThresholds,
  ): Promise<ListingObservationPatternMagnitudeCohort> {
    return this.patternMagnitudeCohort.calculate(
      await this.loadPatternClassifications(provider, limit, thresholds),
    );
  }

  async getPatternTimingCohort(
    provider: 'binance',
    limit: number,
    thresholds: ListingObservationPatternThresholds,
  ): Promise<ListingObservationPatternTimingCohort> {
    return this.patternTimingCohort.calculate(
      await this.loadPatternClassifications(provider, limit, thresholds),
    );
  }

  async getMarketActivityCohort(
    provider: 'binance',
    limit: number,
  ): Promise<ListingObservationMarketActivityCohort> {
    this.validateCohortLimit(limit);
    return this.marketActivityCohort.calculate(
      await this.repository.listCompletedObservationCohort(provider, limit),
    );
  }

  async getTopOfBookCohort(
    provider: 'binance',
    limit: number,
  ): Promise<ListingTopOfBookCohort> {
    this.validateCohortLimit(limit);
    if (!this.topOfBookRepository) {
      throw new Error('Listing top-of-book repository is unavailable');
    }
    return this.topOfBookCohort.calculate(
      await this.topOfBookRepository.listCohort(provider, limit),
    );
  }

  async getCheckpointRoundTripCohort(
    provider: 'binance',
    limit: number,
    selection: ListingCheckpointRoundTripSelection,
  ): Promise<ListingCheckpointRoundTripCohort> {
    return this.checkpointRoundTripCohort.calculate(
      selection,
      await this.loadCheckpointRoundTripSamples(provider, limit, selection),
    );
  }

  async getCheckpointRoundTripOutcomeCohort(
    provider: 'binance',
    limit: number,
    selection: ListingCheckpointRoundTripSelection,
  ): Promise<ListingCheckpointRoundTripOutcomeCohort> {
    return this.checkpointRoundTripOutcomeCohort.calculate(
      selection,
      await this.loadCheckpointRoundTripSamples(provider, limit, selection),
    );
  }

  private async loadCheckpointRoundTripSamples(
    provider: 'binance',
    limit: number,
    selection: ListingCheckpointRoundTripSelection,
  ): Promise<ListingCheckpointRoundTripCohortSample[]> {
    this.validateCohortLimit(limit);
    validateListingCheckpointRoundTripSelection(selection);
    if (!this.topOfBookRepository) {
      throw new Error('Listing top-of-book repository is unavailable');
    }
    const timelines = await this.topOfBookRepository.listCohort(
      provider,
      limit,
    );
    return timelines.map((timeline) => {
      const first = timeline[0];
      if (!first) {
        throw new Error('Listing top-of-book cohort timeline is empty');
      }
      const entry = timeline.find(
        (checkpoint) => checkpoint.label === selection.entryLabel,
      );
      const exit = timeline.find(
        (checkpoint) => checkpoint.label === selection.exitLabel,
      );
      return {
        provider: first.provider,
        symbol: first.symbol,
        roundTrip:
          entry && exit
            ? this.checkpointRoundTrip.calculate(entry, exit, selection)
            : null,
      };
    });
  }

  async getTopOfBookImbalanceCohort(
    provider: 'binance',
    limit: number,
  ): Promise<ListingTopOfBookImbalanceCohort> {
    this.validateCohortLimit(limit);
    if (!this.topOfBookRepository) {
      throw new Error('Listing top-of-book repository is unavailable');
    }
    return this.topOfBookImbalanceCohort.calculate(
      await this.topOfBookRepository.listCohort(provider, limit),
    );
  }

  async getTopOfBookImbalanceEvolutionCohort(
    provider: 'binance',
    limit: number,
  ): Promise<ListingTopOfBookImbalanceEvolutionCohort> {
    this.validateCohortLimit(limit);
    if (!this.topOfBookRepository) {
      throw new Error('Listing top-of-book repository is unavailable');
    }
    const timelines = await this.topOfBookRepository.listCohort(
      provider,
      limit,
    );
    return this.topOfBookImbalanceEvolutionCohort.calculate(
      timelines.flatMap((timeline) => {
        const evolution = this.topOfBookImbalanceEvolution.calculate(timeline);
        return evolution ? [evolution] : [];
      }),
    );
  }

  async getTopOfBookSpreadEvolutionCohort(
    provider: 'binance',
    limit: number,
  ): Promise<ListingTopOfBookSpreadEvolutionCohort> {
    this.validateCohortLimit(limit);
    if (!this.topOfBookRepository) {
      throw new Error('Listing top-of-book repository is unavailable');
    }
    const timelines = await this.topOfBookRepository.listCohort(
      provider,
      limit,
    );
    return this.topOfBookSpreadEvolutionCohort.calculate(
      timelines.flatMap((timeline) => {
        const evolution = this.topOfBookSpreadEvolution.calculate(timeline);
        return evolution ? [evolution] : [];
      }),
    );
  }

  async getTopOfBookSpreadClassificationCohort(
    provider: 'binance',
    limit: number,
    thresholds: ListingTopOfBookSpreadThresholds,
  ): Promise<ListingTopOfBookSpreadClassificationCohort> {
    return this.topOfBookSpreadClassificationCohort.calculate(
      await this.loadTopOfBookSpreadClassifications(
        provider,
        limit,
        thresholds,
      ),
    );
  }

  async getTopOfBookSpreadClassificationMagnitudeCohort(
    provider: 'binance',
    limit: number,
    thresholds: ListingTopOfBookSpreadThresholds,
  ): Promise<ListingTopOfBookSpreadClassificationMagnitudeCohort> {
    return this.topOfBookSpreadClassificationMagnitudeCohort.calculate(
      await this.loadTopOfBookSpreadClassifications(
        provider,
        limit,
        thresholds,
      ),
    );
  }

  async getTopOfBookSpreadClassificationTimingCohort(
    provider: 'binance',
    limit: number,
    thresholds: ListingTopOfBookSpreadThresholds,
  ): Promise<ListingTopOfBookSpreadClassificationTimingCohort> {
    return this.topOfBookSpreadClassificationTimingCohort.calculate(
      await this.loadTopOfBookSpreadClassifications(
        provider,
        limit,
        thresholds,
      ),
    );
  }

  private async loadTopOfBookSpreadClassifications(
    provider: 'binance',
    limit: number,
    thresholds: ListingTopOfBookSpreadThresholds,
  ): Promise<ListingTopOfBookSpreadClassification[]> {
    this.validateCohortLimit(limit);
    validateListingTopOfBookSpreadThresholds(thresholds);
    if (!this.topOfBookRepository) {
      throw new Error('Listing top-of-book repository is unavailable');
    }
    const timelines = await this.topOfBookRepository.listCohort(
      provider,
      limit,
    );
    return timelines.flatMap((timeline) => {
      const evolution = this.topOfBookSpreadEvolution.calculate(timeline);
      return evolution
        ? [this.topOfBookSpreadClassifier.classify(evolution, thresholds)]
        : [];
    });
  }

  private async loadPatternClassifications(
    provider: 'binance',
    limit: number,
    thresholds: ListingObservationPatternThresholds,
  ): Promise<ListingObservationPatternClassification[]> {
    this.validateCohortLimit(limit);
    validateListingObservationPatternThresholds(thresholds);
    const timelines = await this.repository.listCompletedObservationCohort(
      provider,
      limit,
    );
    return timelines.map((timeline) => {
      const performance = this.pricePerformance.calculate(timeline);
      if (!performance) {
        throw new Error('Cohort timeline must include completed T+0');
      }
      return this.patternClassifier.classify(performance, thresholds);
    });
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
