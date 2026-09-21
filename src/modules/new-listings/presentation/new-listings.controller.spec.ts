import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { DetectedSpotSymbol } from '../domain/spot-symbol-catalog';
import {
  DetectedSpotSymbolCursorNotFoundError,
  DetectedSpotSymbolNotFoundError,
} from '../domain/spot-symbol-catalog';
import { NewListingsController } from './new-listings.controller';

describe('NewListingsController', () => {
  it('returns the durable price path cohort with bounded input', async () => {
    const cohort = {
      provider: 'binance' as const,
      sampleSize: 0,
      medianObservedHighOffsetMs: null,
      medianObservedLowOffsetMs: null,
      drawdownSampleSize: 0,
      medianMaximumDrawdownRate: null,
      medianMaximumDrawdownDurationMs: null,
    };
    const getPricePathCohort = jest.fn(() => Promise.resolve(cohort));
    const controller = new NewListingsController({ getPricePathCohort });

    await expect(controller.pricePathCohort()).resolves.toBe(cohort);
    expect(getPricePathCohort).toHaveBeenLastCalledWith('binance', 50);
    await controller.pricePathCohort('25', 'binance');
    expect(getPricePathCohort).toHaveBeenLastCalledWith('binance', 25);
  });

  it.each([
    ['0', undefined],
    ['101', undefined],
    ['1.5', undefined],
    [undefined, 'other'],
  ])('rejects invalid price path cohort query %s/%s', (limit, provider) => {
    const getPricePathCohort = jest.fn(() => Promise.resolve({}));
    const controller = new NewListingsController({ getPricePathCohort });

    expect(() => controller.pricePathCohort(limit, provider)).toThrow(
      BadRequestException,
    );
    expect(getPricePathCohort).not.toHaveBeenCalled();
  });

  it('returns the durable price variability cohort with bounded input', async () => {
    const cohort = {
      provider: 'binance' as const,
      sampleSize: 0,
      transitionSampleSize: 0,
      medianAverageAbsoluteReturnRate: null,
      medianMaximumAbsoluteReturnRate: null,
    };
    const getPriceVariabilityCohort = jest.fn(() => Promise.resolve(cohort));
    const controller = new NewListingsController({
      getPriceVariabilityCohort,
    });

    await expect(controller.priceVariabilityCohort()).resolves.toBe(cohort);
    expect(getPriceVariabilityCohort).toHaveBeenLastCalledWith('binance', 50);
    await controller.priceVariabilityCohort('25', 'binance');
    expect(getPriceVariabilityCohort).toHaveBeenLastCalledWith('binance', 25);
  });

  it.each([
    ['0', undefined],
    ['101', undefined],
    ['1.5', undefined],
    [undefined, 'other'],
  ])('rejects invalid variability cohort query %s/%s', (limit, provider) => {
    const getPriceVariabilityCohort = jest.fn(() => Promise.resolve({}));
    const controller = new NewListingsController({
      getPriceVariabilityCohort,
    });

    expect(() => controller.priceVariabilityCohort(limit, provider)).toThrow(
      BadRequestException,
    );
    expect(getPriceVariabilityCohort).not.toHaveBeenCalled();
  });

  it('returns the durable top-of-book cohort with bounded input', async () => {
    const cohort = {
      provider: 'binance' as const,
      detectionCount: 0,
      checkpoints: [],
    };
    const getTopOfBookCohort = jest.fn(() => Promise.resolve(cohort));
    const controller = new NewListingsController({ getTopOfBookCohort });

    await expect(controller.topOfBookCohort()).resolves.toBe(cohort);
    expect(getTopOfBookCohort).toHaveBeenLastCalledWith('binance', 50);
    await controller.topOfBookCohort('25', 'binance');
    expect(getTopOfBookCohort).toHaveBeenLastCalledWith('binance', 25);
  });

  it.each([
    ['0', undefined],
    ['101', undefined],
    ['1.5', undefined],
    [undefined, 'other'],
  ])('rejects invalid top-of-book cohort query %s/%s', (limit, provider) => {
    const getTopOfBookCohort = jest.fn(() => Promise.resolve({}));
    const controller = new NewListingsController({ getTopOfBookCohort });

    expect(() => controller.topOfBookCohort(limit, provider)).toThrow(
      BadRequestException,
    );
    expect(getTopOfBookCohort).not.toHaveBeenCalled();
  });

  it('returns the durable top-of-book imbalance cohort with bounded input', async () => {
    const cohort = {
      provider: 'binance' as const,
      detectionCount: 0,
      checkpoints: [],
    };
    const getTopOfBookImbalanceCohort = jest.fn(() => Promise.resolve(cohort));
    const controller = new NewListingsController({
      getTopOfBookImbalanceCohort,
    });

    await expect(controller.topOfBookImbalanceCohort()).resolves.toBe(cohort);
    expect(getTopOfBookImbalanceCohort).toHaveBeenLastCalledWith('binance', 50);
    await controller.topOfBookImbalanceCohort('25', 'binance');
    expect(getTopOfBookImbalanceCohort).toHaveBeenLastCalledWith('binance', 25);
  });

  it.each([
    ['0', undefined],
    ['101', undefined],
    ['1.5', undefined],
    [undefined, 'other'],
  ])(
    'rejects invalid top-of-book imbalance cohort query %s/%s',
    (limit, provider) => {
      const getTopOfBookImbalanceCohort = jest.fn(() => Promise.resolve({}));
      const controller = new NewListingsController({
        getTopOfBookImbalanceCohort,
      });

      expect(() =>
        controller.topOfBookImbalanceCohort(limit, provider),
      ).toThrow(BadRequestException);
      expect(getTopOfBookImbalanceCohort).not.toHaveBeenCalled();
    },
  );

  it('returns the durable spread classification timing cohort', async () => {
    const cohort = {
      provider: 'binance' as const,
      thresholds: { wideningBasisPoints: '100' },
      wideningSampleSize: 1,
      medianTimeToWideningMs: 5_000,
    };
    const getTopOfBookSpreadClassificationTimingCohort = jest.fn(() =>
      Promise.resolve(cohort),
    );
    const controller = new NewListingsController({
      getTopOfBookSpreadClassificationTimingCohort,
    });

    await expect(
      controller.topOfBookSpreadClassificationTimingCohort(
        undefined,
        undefined,
        '100',
      ),
    ).resolves.toBe(cohort);
    expect(getTopOfBookSpreadClassificationTimingCohort).toHaveBeenCalledWith(
      'binance',
      50,
      { wideningBasisPoints: '100' },
    );
  });

  it.each([
    ['0', undefined, '100'],
    ['101', undefined, '100'],
    [undefined, 'other', '100'],
    [undefined, undefined, undefined],
  ])(
    'rejects invalid spread classification timing cohort query %s/%s/%s',
    (limit, provider, wideningBasisPoints) => {
      const getTopOfBookSpreadClassificationTimingCohort = jest.fn(() =>
        Promise.resolve({}),
      );
      const controller = new NewListingsController({
        getTopOfBookSpreadClassificationTimingCohort,
      });

      expect(() =>
        controller.topOfBookSpreadClassificationTimingCohort(
          limit,
          provider,
          wideningBasisPoints,
        ),
      ).toThrow(BadRequestException);
      expect(
        getTopOfBookSpreadClassificationTimingCohort,
      ).not.toHaveBeenCalled();
    },
  );

  it('returns the durable spread classification magnitude cohort', async () => {
    const cohort = {
      provider: 'binance' as const,
      thresholds: { wideningBasisPoints: '100' },
      wideningSampleSize: 1,
      medianMaximumWideningBasisPoints: '250',
    };
    const getTopOfBookSpreadClassificationMagnitudeCohort = jest.fn(() =>
      Promise.resolve(cohort),
    );
    const controller = new NewListingsController({
      getTopOfBookSpreadClassificationMagnitudeCohort,
    });

    await expect(
      controller.topOfBookSpreadClassificationMagnitudeCohort(
        undefined,
        undefined,
        '100',
      ),
    ).resolves.toBe(cohort);
    expect(
      getTopOfBookSpreadClassificationMagnitudeCohort,
    ).toHaveBeenCalledWith('binance', 50, { wideningBasisPoints: '100' });
  });

  it.each([
    ['0', undefined, '100'],
    ['101', undefined, '100'],
    [undefined, 'other', '100'],
    [undefined, undefined, undefined],
  ])(
    'rejects invalid spread classification magnitude cohort query %s/%s/%s',
    (limit, provider, wideningBasisPoints) => {
      const getTopOfBookSpreadClassificationMagnitudeCohort = jest.fn(() =>
        Promise.resolve({}),
      );
      const controller = new NewListingsController({
        getTopOfBookSpreadClassificationMagnitudeCohort,
      });

      expect(() =>
        controller.topOfBookSpreadClassificationMagnitudeCohort(
          limit,
          provider,
          wideningBasisPoints,
        ),
      ).toThrow(BadRequestException);
      expect(
        getTopOfBookSpreadClassificationMagnitudeCohort,
      ).not.toHaveBeenCalled();
    },
  );

  it('returns the durable spread classification cohort with explicit input', async () => {
    const cohort = {
      provider: 'binance' as const,
      thresholds: { wideningBasisPoints: '100' },
      classificationCount: 0,
      noWideningObservedCount: 0,
      wideningObservedCount: 0,
      wideningObservedRate: null,
    };
    const getTopOfBookSpreadClassificationCohort = jest.fn(() =>
      Promise.resolve(cohort),
    );
    const controller = new NewListingsController({
      getTopOfBookSpreadClassificationCohort,
    });

    await expect(
      controller.topOfBookSpreadClassificationCohort(
        undefined,
        undefined,
        '100',
      ),
    ).resolves.toBe(cohort);
    expect(getTopOfBookSpreadClassificationCohort).toHaveBeenCalledWith(
      'binance',
      50,
      { wideningBasisPoints: '100' },
    );
  });

  it.each([
    ['0', undefined, '100'],
    ['101', undefined, '100'],
    [undefined, 'other', '100'],
    [undefined, undefined, undefined],
  ])(
    'rejects invalid spread classification cohort query %s/%s/%s',
    (limit, provider, wideningBasisPoints) => {
      const getTopOfBookSpreadClassificationCohort = jest.fn(() =>
        Promise.resolve({}),
      );
      const controller = new NewListingsController({
        getTopOfBookSpreadClassificationCohort,
      });

      expect(() =>
        controller.topOfBookSpreadClassificationCohort(
          limit,
          provider,
          wideningBasisPoints,
        ),
      ).toThrow(BadRequestException);
      expect(getTopOfBookSpreadClassificationCohort).not.toHaveBeenCalled();
    },
  );

  it('returns the durable imbalance evolution cohort with bounded input', async () => {
    const cohort = {
      provider: 'binance' as const,
      detectionCount: 0,
      checkpoints: [],
    };
    const getTopOfBookImbalanceEvolutionCohort = jest.fn(() =>
      Promise.resolve(cohort),
    );
    const controller = new NewListingsController({
      getTopOfBookImbalanceEvolutionCohort,
    });

    await expect(controller.topOfBookImbalanceEvolutionCohort()).resolves.toBe(
      cohort,
    );
    expect(getTopOfBookImbalanceEvolutionCohort).toHaveBeenLastCalledWith(
      'binance',
      50,
    );
    await controller.topOfBookImbalanceEvolutionCohort('25', 'binance');
    expect(getTopOfBookImbalanceEvolutionCohort).toHaveBeenLastCalledWith(
      'binance',
      25,
    );
  });

  it.each([
    ['0', undefined],
    ['101', undefined],
    ['1.5', undefined],
    [undefined, 'other'],
  ])(
    'rejects invalid imbalance evolution cohort query %s/%s',
    (limit, provider) => {
      const getTopOfBookImbalanceEvolutionCohort = jest.fn(() =>
        Promise.resolve({}),
      );
      const controller = new NewListingsController({
        getTopOfBookImbalanceEvolutionCohort,
      });

      expect(() =>
        controller.topOfBookImbalanceEvolutionCohort(limit, provider),
      ).toThrow(BadRequestException);
      expect(getTopOfBookImbalanceEvolutionCohort).not.toHaveBeenCalled();
    },
  );

  it('returns the durable spread evolution cohort with bounded input', async () => {
    const cohort = {
      provider: 'binance' as const,
      detectionCount: 0,
      checkpoints: [],
    };
    const getTopOfBookSpreadEvolutionCohort = jest.fn(() =>
      Promise.resolve(cohort),
    );
    const controller = new NewListingsController({
      getTopOfBookSpreadEvolutionCohort,
    });

    await expect(controller.topOfBookSpreadEvolutionCohort()).resolves.toBe(
      cohort,
    );
    expect(getTopOfBookSpreadEvolutionCohort).toHaveBeenLastCalledWith(
      'binance',
      50,
    );
    await controller.topOfBookSpreadEvolutionCohort('25', 'binance');
    expect(getTopOfBookSpreadEvolutionCohort).toHaveBeenLastCalledWith(
      'binance',
      25,
    );
  });

  it.each([
    ['0', undefined],
    ['101', undefined],
    ['1.5', undefined],
    [undefined, 'other'],
  ])(
    'rejects invalid spread evolution cohort query %s/%s',
    (limit, provider) => {
      const getTopOfBookSpreadEvolutionCohort = jest.fn(() =>
        Promise.resolve({}),
      );
      const controller = new NewListingsController({
        getTopOfBookSpreadEvolutionCohort,
      });

      expect(() =>
        controller.topOfBookSpreadEvolutionCohort(limit, provider),
      ).toThrow(BadRequestException);
      expect(getTopOfBookSpreadEvolutionCohort).not.toHaveBeenCalled();
    },
  );

  it('returns durable checkpoint market activity with bounded input', async () => {
    const activity = {
      provider: 'binance' as const,
      detectionCount: 0,
      checkpoints: [],
    };
    const getMarketActivityCohort = jest.fn(() => Promise.resolve(activity));
    const controller = new NewListingsController({ getMarketActivityCohort });

    await expect(controller.marketActivityCohort()).resolves.toBe(activity);
    expect(getMarketActivityCohort).toHaveBeenLastCalledWith('binance', 50);
    await controller.marketActivityCohort('25', 'binance');
    expect(getMarketActivityCohort).toHaveBeenLastCalledWith('binance', 25);
  });

  it.each([
    ['0', undefined],
    ['101', undefined],
    ['1.5', undefined],
    [undefined, 'other'],
  ])('rejects invalid activity query %s/%s', (limit, provider) => {
    const getMarketActivityCohort = jest.fn(() => Promise.resolve({}));
    const controller = new NewListingsController({ getMarketActivityCohort });

    expect(() => controller.marketActivityCohort(limit, provider)).toThrow(
      BadRequestException,
    );
    expect(getMarketActivityCohort).not.toHaveBeenCalled();
  });

  it('returns durable pattern timing medians for explicit thresholds', async () => {
    const timing = {
      provider: 'binance' as const,
      pumpSampleSize: 0,
      correctionSampleSize: 0,
    };
    const getPatternTimingCohort = jest.fn(() => Promise.resolve(timing));
    const controller = new NewListingsController({ getPatternTimingCohort });

    await expect(
      controller.patternTimingCohort(undefined, undefined, '0.2', '0.25'),
    ).resolves.toBe(timing);
    expect(getPatternTimingCohort).toHaveBeenLastCalledWith('binance', 50, {
      pumpReturnRate: '0.2',
      correctionFromPeakRate: '0.25',
    });

    await controller.patternTimingCohort('25', 'binance', '0.3', '0.1');
    expect(getPatternTimingCohort).toHaveBeenLastCalledWith('binance', 25, {
      pumpReturnRate: '0.3',
      correctionFromPeakRate: '0.1',
    });
  });

  it.each([
    [undefined, undefined, undefined, '0.25'],
    [undefined, undefined, '0.2', undefined],
    ['0', undefined, '0.2', '0.25'],
    [undefined, 'other', '0.2', '0.25'],
    [undefined, undefined, '0', '0.25'],
    [undefined, undefined, '0.2', '1.1'],
  ])(
    'rejects invalid pattern timing query %s/%s/%s/%s',
    (limit, provider, pumpReturnRate, correctionFromPeakRate) => {
      const getPatternTimingCohort = jest.fn(() => Promise.resolve({}));
      const controller = new NewListingsController({ getPatternTimingCohort });

      expect(() =>
        controller.patternTimingCohort(
          limit,
          provider,
          pumpReturnRate,
          correctionFromPeakRate,
        ),
      ).toThrow(BadRequestException);
      expect(getPatternTimingCohort).not.toHaveBeenCalled();
    },
  );

  it('returns durable pattern magnitude medians for explicit thresholds', async () => {
    const magnitudes = {
      provider: 'binance' as const,
      pumpSampleSize: 0,
      correctionSampleSize: 0,
    };
    const getPatternMagnitudeCohort = jest.fn(() =>
      Promise.resolve(magnitudes),
    );
    const controller = new NewListingsController({
      getPatternMagnitudeCohort,
    });

    await expect(
      controller.patternMagnitudeCohort(undefined, undefined, '0.2', '0.25'),
    ).resolves.toBe(magnitudes);
    expect(getPatternMagnitudeCohort).toHaveBeenLastCalledWith('binance', 50, {
      pumpReturnRate: '0.2',
      correctionFromPeakRate: '0.25',
    });

    await controller.patternMagnitudeCohort('25', 'binance', '0.3', '0.1');
    expect(getPatternMagnitudeCohort).toHaveBeenLastCalledWith('binance', 25, {
      pumpReturnRate: '0.3',
      correctionFromPeakRate: '0.1',
    });
  });

  it.each([
    [undefined, undefined, undefined, '0.25'],
    [undefined, undefined, '0.2', undefined],
    ['0', undefined, '0.2', '0.25'],
    [undefined, 'other', '0.2', '0.25'],
    [undefined, undefined, '0', '0.25'],
    [undefined, undefined, '0.2', '1.1'],
  ])(
    'rejects invalid pattern magnitude query %s/%s/%s/%s',
    (limit, provider, pumpReturnRate, correctionFromPeakRate) => {
      const getPatternMagnitudeCohort = jest.fn(() => Promise.resolve({}));
      const controller = new NewListingsController({
        getPatternMagnitudeCohort,
      });

      expect(() =>
        controller.patternMagnitudeCohort(
          limit,
          provider,
          pumpReturnRate,
          correctionFromPeakRate,
        ),
      ).toThrow(BadRequestException);
      expect(getPatternMagnitudeCohort).not.toHaveBeenCalled();
    },
  );

  it('returns durable pattern cohort statistics for explicit thresholds', async () => {
    const cohort = {
      provider: 'binance' as const,
      classificationCount: 0,
    };
    const getPatternCohort = jest.fn(() => Promise.resolve(cohort));
    const controller = new NewListingsController({ getPatternCohort });

    await expect(
      controller.patternCohort(undefined, undefined, '0.2', '0.25'),
    ).resolves.toBe(cohort);
    expect(getPatternCohort).toHaveBeenLastCalledWith('binance', 50, {
      pumpReturnRate: '0.2',
      correctionFromPeakRate: '0.25',
    });

    await controller.patternCohort('25', 'binance', '0.3', '0.1');
    expect(getPatternCohort).toHaveBeenLastCalledWith('binance', 25, {
      pumpReturnRate: '0.3',
      correctionFromPeakRate: '0.1',
    });
  });

  it.each([
    [undefined, undefined, undefined, '0.25'],
    [undefined, undefined, '0.2', undefined],
    ['0', undefined, '0.2', '0.25'],
    [undefined, 'other', '0.2', '0.25'],
    [undefined, undefined, '0', '0.25'],
    [undefined, undefined, '0.2', '1.1'],
  ])(
    'rejects invalid pattern cohort query %s/%s/%s/%s',
    (limit, provider, pumpReturnRate, correctionFromPeakRate) => {
      const getPatternCohort = jest.fn(() => Promise.resolve({}));
      const controller = new NewListingsController({ getPatternCohort });

      expect(() =>
        controller.patternCohort(
          limit,
          provider,
          pumpReturnRate,
          correctionFromPeakRate,
        ),
      ).toThrow(BadRequestException);
      expect(getPatternCohort).not.toHaveBeenCalled();
    },
  );

  it('returns durable pattern classification for explicit thresholds', async () => {
    const classification = {
      provider: 'binance' as const,
      symbol: 'NEWUSDT',
      status: 'no-pump-observed' as const,
    };
    const getPatternClassification = jest.fn(() =>
      Promise.resolve(classification),
    );
    const controller = new NewListingsController({ getPatternClassification });

    await expect(
      controller.classification('binance', 'NEWUSDT', '0.2', '0.25'),
    ).resolves.toBe(classification);
    expect(getPatternClassification).toHaveBeenCalledWith(
      'binance',
      'NEWUSDT',
      { pumpReturnRate: '0.2', correctionFromPeakRate: '0.25' },
    );
  });

  it.each([
    [undefined, '0.25'],
    ['0.2', undefined],
    ['0', '0.25'],
    ['0.2', '1.1'],
  ])(
    'rejects invalid classification thresholds %s/%s before loading',
    async (pumpReturnRate, correctionFromPeakRate) => {
      const getPatternClassification = jest.fn(() => Promise.resolve(null));
      const controller = new NewListingsController({
        getPatternClassification,
      });
      await expect(
        controller.classification(
          'binance',
          'NEWUSDT',
          pumpReturnRate,
          correctionFromPeakRate,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(getPatternClassification).not.toHaveBeenCalled();
    },
  );

  it('maps unavailable and unknown classification identities explicitly', async () => {
    const unavailable = new NewListingsController({
      getPatternClassification: jest.fn(() => Promise.resolve(null)),
    });
    await expect(
      unavailable.classification('binance', 'NEWUSDT', '0.2', '0.25'),
    ).rejects.toThrow('T+0 listing observation is not available');

    const missing = new NewListingsController({
      getPatternClassification: jest.fn(() =>
        Promise.reject(new DetectedSpotSymbolNotFoundError()),
      ),
    });
    await expect(
      missing.classification('binance', 'UNKNOWNUSDT', '0.2', '0.25'),
    ).rejects.toThrow('detected symbol was not found');
  });

  it('returns recent durable cohort performance with bounded input', async () => {
    const cohort = {
      provider: 'binance' as const,
      detectionCount: 0,
      checkpoints: [],
    };
    const getCohortPerformance = jest.fn(() => Promise.resolve(cohort));
    const controller = new NewListingsController({ getCohortPerformance });

    await expect(controller.cohortPerformance()).resolves.toBe(cohort);
    expect(getCohortPerformance).toHaveBeenLastCalledWith('binance', 50);
    await controller.cohortPerformance('25', 'binance');
    expect(getCohortPerformance).toHaveBeenLastCalledWith('binance', 25);
  });

  it.each([
    ['0', undefined],
    ['101', undefined],
    ['1.5', undefined],
    [undefined, 'other'],
  ])('rejects invalid cohort query %s/%s', (limit, provider) => {
    const controller = new NewListingsController({
      getCohortPerformance: jest.fn(() => Promise.resolve({})),
    });
    expect(() => controller.cohortPerformance(limit, provider)).toThrow(
      BadRequestException,
    );
  });

  it('returns available listing price performance', async () => {
    const performance = {
      provider: 'binance' as const,
      symbol: 'NEWUSDT',
      baselineLabel: 'T+0' as const,
      baselinePrice: '100',
      points: [],
    };
    const getPricePerformance = jest.fn(() => Promise.resolve(performance));
    const controller = new NewListingsController({ getPricePerformance });

    await expect(controller.performance('binance', 'NEWUSDT')).resolves.toBe(
      performance,
    );
  });

  it('maps missing T+0 performance to service unavailable', async () => {
    const controller = new NewListingsController({
      getPricePerformance: jest.fn(() => Promise.resolve(null)),
    });
    await expect(controller.performance('binance', 'NEWUSDT')).rejects.toThrow(
      'T+0 listing observation is not available',
    );
  });

  it('maps an unknown performance identity to not found', async () => {
    const controller = new NewListingsController({
      getPricePerformance: jest.fn(() =>
        Promise.reject(new DetectedSpotSymbolNotFoundError()),
      ),
    });
    await expect(
      controller.performance('binance', 'UNKNOWNUSDT'),
    ).rejects.toThrow('detected symbol was not found');
  });

  it('returns available listing price path statistics', async () => {
    const statistics = {
      provider: 'binance' as const,
      symbol: 'NEWUSDT',
      observedHigh: {
        label: 'T+5s' as const,
        offsetMs: 5_000,
        lastPrice: '120',
      },
      observedLow: {
        label: 'T+10s' as const,
        offsetMs: 10_000,
        lastPrice: '90',
      },
      maximumDrawdown: {
        peak: { label: 'T+5s' as const, offsetMs: 5_000, lastPrice: '120' },
        trough: { label: 'T+10s' as const, offsetMs: 10_000, lastPrice: '90' },
        absolutePriceDrawdown: '30',
        priceDrawdownRate: '0.25',
      },
    };
    const getPricePathStatistics = jest.fn(() => Promise.resolve(statistics));
    const controller = new NewListingsController({ getPricePathStatistics });

    await expect(controller.pricePath('binance', 'NEWUSDT')).resolves.toBe(
      statistics,
    );
    expect(getPricePathStatistics).toHaveBeenCalledWith('binance', 'NEWUSDT');
  });

  it('maps missing T+0 price path to service unavailable', async () => {
    const controller = new NewListingsController({
      getPricePathStatistics: jest.fn(() => Promise.resolve(null)),
    });

    await expect(controller.pricePath('binance', 'NEWUSDT')).rejects.toThrow(
      'T+0 listing observation is not available',
    );
  });

  it('maps an unknown price path identity to not found', async () => {
    const controller = new NewListingsController({
      getPricePathStatistics: jest.fn(() =>
        Promise.reject(new DetectedSpotSymbolNotFoundError()),
      ),
    });

    await expect(
      controller.pricePath('binance', 'UNKNOWNUSDT'),
    ).rejects.toThrow('detected symbol was not found');
  });

  it('rejects an invalid price path identity before read-model access', async () => {
    const getPricePathStatistics = jest.fn(() => Promise.resolve(null));
    const controller = new NewListingsController({ getPricePathStatistics });

    await expect(
      controller.pricePath('binance', 'newusdt'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(getPricePathStatistics).not.toHaveBeenCalled();
  });

  it('returns available listing price variability', async () => {
    const variability = {
      provider: 'binance' as const,
      symbol: 'NEWUSDT',
      transitionCount: 1,
      averageAbsoluteReturnRate: '0.2',
      maximumAbsoluteReturn: {
        from: { label: 'T+0' as const, offsetMs: 0, lastPrice: '100' },
        to: { label: 'T+5s' as const, offsetMs: 5_000, lastPrice: '120' },
        durationMs: 5_000,
        returnRate: '0.2',
        absoluteReturnRate: '0.2',
      },
    };
    const getPriceVariability = jest.fn(() => Promise.resolve(variability));
    const controller = new NewListingsController({ getPriceVariability });

    await expect(controller.variability('binance', 'NEWUSDT')).resolves.toBe(
      variability,
    );
    expect(getPriceVariability).toHaveBeenCalledWith('binance', 'NEWUSDT');
  });

  it('maps missing T+0 price variability to service unavailable', async () => {
    const controller = new NewListingsController({
      getPriceVariability: jest.fn(() => Promise.resolve(null)),
    });

    await expect(controller.variability('binance', 'NEWUSDT')).rejects.toThrow(
      'T+0 listing observation is not available',
    );
  });

  it('maps an unknown price variability identity to not found', async () => {
    const controller = new NewListingsController({
      getPriceVariability: jest.fn(() =>
        Promise.reject(new DetectedSpotSymbolNotFoundError()),
      ),
    });

    await expect(
      controller.variability('binance', 'UNKNOWNUSDT'),
    ).rejects.toThrow('detected symbol was not found');
  });

  it('rejects an invalid variability identity before read-model access', async () => {
    const getPriceVariability = jest.fn(() => Promise.resolve(null));
    const controller = new NewListingsController({ getPriceVariability });

    await expect(
      controller.variability('binance', 'newusdt'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(getPriceVariability).not.toHaveBeenCalled();
  });

  it('returns the completed observation timeline for a detected symbol', async () => {
    const listObservations = jest.fn(() => Promise.resolve([]));
    const controller = new NewListingsController({ listObservations });

    await expect(
      controller.observations('binance', 'NEWUSDT'),
    ).resolves.toEqual([]);
    expect(listObservations).toHaveBeenCalledWith('binance', 'NEWUSDT');
  });

  it('returns an explicit durable checkpoint round trip', async () => {
    const roundTrip = {
      provider: 'binance' as const,
      symbol: 'NEWUSDT',
      configuration: { feeRate: '0.001', slippageRate: '0.002' },
      entry: {
        label: 'T+0' as const,
        offsetMs: 0,
        referencePrice: '101',
        executionPrice: '101.202',
      },
      exit: {
        label: 'T+5s' as const,
        offsetMs: 5_000,
        referencePrice: '109',
        executionPrice: '108.782',
      },
      durationMs: 5_000,
      grossReturnRate: '0.07920792079207920792079207920792079207921',
      netReturnRate: '0.072900248172928024863329951883014439248',
      profitableAfterCosts: true,
    };
    const getCheckpointRoundTrip = jest.fn(() => Promise.resolve(roundTrip));
    const controller = new NewListingsController({ getCheckpointRoundTrip });

    await expect(
      controller.checkpointRoundTrip(
        'binance',
        'NEWUSDT',
        'T+0',
        'T+5s',
        '0.001',
        '0.002',
      ),
    ).resolves.toBe(roundTrip);
    expect(getCheckpointRoundTrip).toHaveBeenCalledWith('binance', 'NEWUSDT', {
      entryLabel: 'T+0',
      exitLabel: 'T+5s',
      feeRate: '0.001',
      slippageRate: '0.002',
    });
  });

  it('maps missing selected checkpoint books to service unavailable', async () => {
    const controller = new NewListingsController({
      getCheckpointRoundTrip: jest.fn(() => Promise.resolve(null)),
    });

    await expect(
      controller.checkpointRoundTrip(
        'binance',
        'NEWUSDT',
        'T+0',
        'T+5s',
        '0',
        '0',
      ),
    ).rejects.toThrow('selected top-of-book checkpoints are not available');
  });

  it('maps an unknown round-trip identity to not found', async () => {
    const controller = new NewListingsController({
      getCheckpointRoundTrip: jest.fn(() =>
        Promise.reject(new DetectedSpotSymbolNotFoundError()),
      ),
    });

    await expect(
      controller.checkpointRoundTrip(
        'binance',
        'UNKNOWNUSDT',
        'T+0',
        'T+5s',
        '0',
        '0',
      ),
    ).rejects.toThrow('detected symbol was not found');
  });

  it('rejects invalid round-trip input before read-model access', async () => {
    const getCheckpointRoundTrip = jest.fn(() => Promise.resolve(null));
    const controller = new NewListingsController({ getCheckpointRoundTrip });

    await expect(
      controller.checkpointRoundTrip(
        'binance',
        'NEWUSDT',
        'T+5s',
        'T+0',
        '0',
        '0',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(getCheckpointRoundTrip).not.toHaveBeenCalled();
  });

  it.each([
    ['other', 'NEWUSDT'],
    ['binance', 'newusdt'],
    ['binance', ''],
  ])('rejects invalid observation identity %s/%s', async (provider, symbol) => {
    const controller = new NewListingsController({
      listObservations: jest.fn(() => Promise.resolve([])),
    });
    await expect(
      controller.observations(provider, symbol),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('maps an unknown observation identity to not found', async () => {
    const controller = new NewListingsController({
      listObservations: jest.fn(() =>
        Promise.reject(new DetectedSpotSymbolNotFoundError()),
      ),
    });
    await expect(
      controller.observations('binance', 'UNKNOWNUSDT'),
    ).rejects.toThrow('detected symbol was not found');
  });

  it('returns the durable top-of-book timeline for a detected symbol', async () => {
    const listTopOfBook = jest.fn(() => Promise.resolve([]));
    const controller = new NewListingsController({ listTopOfBook });

    await expect(controller.topOfBook('binance', 'NEWUSDT')).resolves.toEqual(
      [],
    );
    expect(listTopOfBook).toHaveBeenCalledWith('binance', 'NEWUSDT');
  });

  it.each([
    ['other', 'NEWUSDT'],
    ['binance', 'newusdt'],
    ['binance', ''],
  ])('rejects invalid top-of-book identity %s/%s', async (provider, symbol) => {
    const listTopOfBook = jest.fn(() => Promise.resolve([]));
    const controller = new NewListingsController({ listTopOfBook });

    await expect(controller.topOfBook(provider, symbol)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(listTopOfBook).not.toHaveBeenCalled();
  });

  it('maps an unknown top-of-book identity to not found', async () => {
    const controller = new NewListingsController({
      listTopOfBook: jest.fn(() =>
        Promise.reject(new DetectedSpotSymbolNotFoundError()),
      ),
    });

    await expect(
      controller.topOfBook('binance', 'UNKNOWNUSDT'),
    ).rejects.toThrow('detected symbol was not found');
  });

  it('returns the durable top-of-book imbalance timeline for a detected symbol', async () => {
    const listTopOfBookImbalance = jest.fn(() => Promise.resolve([]));
    const controller = new NewListingsController({ listTopOfBookImbalance });

    await expect(
      controller.topOfBookImbalance('binance', 'NEWUSDT'),
    ).resolves.toEqual([]);
    expect(listTopOfBookImbalance).toHaveBeenCalledWith('binance', 'NEWUSDT');
  });

  it.each([
    ['other', 'NEWUSDT'],
    ['binance', 'newusdt'],
    ['binance', ''],
  ])(
    'rejects invalid top-of-book imbalance identity %s/%s',
    async (provider, symbol) => {
      const listTopOfBookImbalance = jest.fn(() => Promise.resolve([]));
      const controller = new NewListingsController({ listTopOfBookImbalance });

      await expect(
        controller.topOfBookImbalance(provider, symbol),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(listTopOfBookImbalance).not.toHaveBeenCalled();
    },
  );

  it('maps an unknown top-of-book imbalance identity to not found', async () => {
    const controller = new NewListingsController({
      listTopOfBookImbalance: jest.fn(() =>
        Promise.reject(new DetectedSpotSymbolNotFoundError()),
      ),
    });

    await expect(
      controller.topOfBookImbalance('binance', 'UNKNOWNUSDT'),
    ).rejects.toThrow('detected symbol was not found');
  });

  it('returns durable top-of-book imbalance evolution', async () => {
    const evolution = {
      provider: 'binance' as const,
      symbol: 'NEWUSDT',
      baselineLabel: 'T+0' as const,
      baselineImbalanceRate: '0.25',
      points: [],
    };
    const getTopOfBookImbalanceEvolution = jest.fn(() =>
      Promise.resolve(evolution),
    );
    const controller = new NewListingsController({
      getTopOfBookImbalanceEvolution,
    });

    await expect(
      controller.topOfBookImbalanceEvolution('binance', 'NEWUSDT'),
    ).resolves.toBe(evolution);
    expect(getTopOfBookImbalanceEvolution).toHaveBeenCalledWith(
      'binance',
      'NEWUSDT',
    );
  });

  it.each([
    ['other', 'NEWUSDT'],
    ['binance', 'newusdt'],
    ['binance', ''],
  ])(
    'rejects invalid top-of-book imbalance evolution identity %s/%s',
    async (provider, symbol) => {
      const getTopOfBookImbalanceEvolution = jest.fn(() => Promise.resolve({}));
      const controller = new NewListingsController({
        getTopOfBookImbalanceEvolution,
      });

      await expect(
        controller.topOfBookImbalanceEvolution(provider, symbol),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(getTopOfBookImbalanceEvolution).not.toHaveBeenCalled();
    },
  );

  it('reports top-of-book imbalance evolution unavailable without T+0', async () => {
    const controller = new NewListingsController({
      getTopOfBookImbalanceEvolution: jest.fn(() => Promise.resolve(null)),
    });

    await expect(
      controller.topOfBookImbalanceEvolution('binance', 'NEWUSDT'),
    ).rejects.toThrow('T+0 top-of-book imbalance is not available');
  });

  it('maps unknown imbalance evolution identity to not found', async () => {
    const controller = new NewListingsController({
      getTopOfBookImbalanceEvolution: jest.fn(() =>
        Promise.reject(new DetectedSpotSymbolNotFoundError()),
      ),
    });

    await expect(
      controller.topOfBookImbalanceEvolution('binance', 'UNKNOWNUSDT'),
    ).rejects.toThrow('detected symbol was not found');
  });

  it('returns durable top-of-book spread evolution', async () => {
    const evolution = {
      provider: 'binance' as const,
      symbol: 'NEWUSDT',
      baselineLabel: 'T+0' as const,
      baselineSpreadBasisPoints: '200',
      points: [],
    };
    const getTopOfBookSpreadEvolution = jest.fn(() =>
      Promise.resolve(evolution),
    );
    const controller = new NewListingsController({
      getTopOfBookSpreadEvolution,
    });

    await expect(
      controller.topOfBookSpreadEvolution('binance', 'NEWUSDT'),
    ).resolves.toBe(evolution);
    expect(getTopOfBookSpreadEvolution).toHaveBeenCalledWith(
      'binance',
      'NEWUSDT',
    );
  });

  it.each([
    ['other', 'NEWUSDT'],
    ['binance', 'newusdt'],
    ['binance', ''],
  ])(
    'rejects invalid top-of-book spread evolution identity %s/%s',
    async (provider, symbol) => {
      const getTopOfBookSpreadEvolution = jest.fn(() => Promise.resolve({}));
      const controller = new NewListingsController({
        getTopOfBookSpreadEvolution,
      });

      await expect(
        controller.topOfBookSpreadEvolution(provider, symbol),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(getTopOfBookSpreadEvolution).not.toHaveBeenCalled();
    },
  );

  it('reports top-of-book spread evolution unavailable without T+0', async () => {
    const controller = new NewListingsController({
      getTopOfBookSpreadEvolution: jest.fn(() => Promise.resolve(null)),
    });

    await expect(
      controller.topOfBookSpreadEvolution('binance', 'NEWUSDT'),
    ).rejects.toThrow('T+0 top-of-book spread is not available');
  });

  it('maps unknown spread evolution identity to not found', async () => {
    const controller = new NewListingsController({
      getTopOfBookSpreadEvolution: jest.fn(() =>
        Promise.reject(new DetectedSpotSymbolNotFoundError()),
      ),
    });

    await expect(
      controller.topOfBookSpreadEvolution('binance', 'UNKNOWNUSDT'),
    ).rejects.toThrow('detected symbol was not found');
  });

  it('returns durable top-of-book spread classification', async () => {
    const classification = {
      provider: 'binance' as const,
      symbol: 'NEWUSDT',
      status: 'widening-observed' as const,
      thresholds: { wideningBasisPoints: '100' },
      evaluatedThroughLabel: 'T+1h' as const,
      widening: null,
      maximumWidening: {},
    };
    const getTopOfBookSpreadClassification = jest.fn(() =>
      Promise.resolve(classification),
    );
    const controller = new NewListingsController({
      getTopOfBookSpreadClassification,
    });

    await expect(
      controller.topOfBookSpreadClassification('binance', 'NEWUSDT', '100'),
    ).resolves.toBe(classification);
    expect(getTopOfBookSpreadClassification).toHaveBeenCalledWith(
      'binance',
      'NEWUSDT',
      { wideningBasisPoints: '100' },
    );
  });

  it.each([undefined, '0', 'not-a-number'])(
    'rejects invalid top-of-book spread classification threshold %s',
    async (wideningBasisPoints) => {
      const getTopOfBookSpreadClassification = jest.fn(() =>
        Promise.resolve({}),
      );
      const controller = new NewListingsController({
        getTopOfBookSpreadClassification,
      });

      await expect(
        controller.topOfBookSpreadClassification(
          'binance',
          'NEWUSDT',
          wideningBasisPoints,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(getTopOfBookSpreadClassification).not.toHaveBeenCalled();
    },
  );

  it('reports spread classification unavailable without T+0', async () => {
    const controller = new NewListingsController({
      getTopOfBookSpreadClassification: jest.fn(() => Promise.resolve(null)),
    });

    await expect(
      controller.topOfBookSpreadClassification('binance', 'NEWUSDT', '100'),
    ).rejects.toThrow('T+0 top-of-book spread is not available');
  });

  it('maps unknown spread classification identity to not found', async () => {
    const controller = new NewListingsController({
      getTopOfBookSpreadClassification: jest.fn(() =>
        Promise.reject(new DetectedSpotSymbolNotFoundError()),
      ),
    });

    await expect(
      controller.topOfBookSpreadClassification('binance', 'UNKNOWNUSDT', '100'),
    ).rejects.toThrow('detected symbol was not found');
  });

  it('returns a filtered detection summary without pagination input', async () => {
    const summarize = jest.fn(() =>
      Promise.resolve({
        count: 2,
        firstDetectedAt: new Date('2026-09-14T02:00:00.000Z'),
        lastDetectedAt: new Date('2026-09-14T03:00:00.000Z'),
        byStatus: [{ status: 'TRADING', count: 2 }],
        bySpotTradingAllowed: [{ spotTradingAllowed: true, count: 2 }],
      }),
    );
    const controller = new NewListingsController({ summarize });

    await expect(
      controller.summary(
        '2026-09-14T01:00:00.000Z',
        '2026-09-14T04:00:00.000Z',
        'binance',
        'TRADING',
        'true',
      ),
    ).resolves.toMatchObject({ count: 2 });
    expect(summarize).toHaveBeenCalledWith({
      detectedFrom: new Date('2026-09-14T01:00:00.000Z'),
      detectedTo: new Date('2026-09-14T04:00:00.000Z'),
      provider: 'binance',
      status: 'TRADING',
      spotTradingAllowed: true,
    });
  });

  it('applies list filter validation to the summary', () => {
    const controller = new NewListingsController({
      summarize: jest.fn(() => Promise.resolve({})),
    });
    expect(() =>
      controller.summary(undefined, undefined, undefined, 'trading'),
    ).toThrow('status must be an uppercase provider status');
  });

  it('uses the default or requested bounded limit', async () => {
    const listRecent = jest.fn((query: { limit: number }) =>
      Promise.resolve(query.limit > 0 ? [detection()] : []),
    );
    const controller = new NewListingsController({ listRecent });

    await expect(controller.list()).resolves.toHaveLength(1);
    expect(listRecent).toHaveBeenLastCalledWith(
      { limit: 50, detectedFrom: undefined, detectedTo: undefined },
      undefined,
    );
    await expect(controller.list('1')).resolves.toHaveLength(1);
    expect(listRecent).toHaveBeenLastCalledWith(
      { limit: 1, detectedFrom: undefined, detectedTo: undefined },
      undefined,
    );
  });

  it.each(['0', '-1', '1.5', 'abc', '101'])(
    'rejects invalid limit %s',
    async (limit) => {
      const controller = new NewListingsController({
        listRecent: jest.fn(() => Promise.resolve([])),
      });
      await expect(controller.list(limit)).rejects.toThrow(
        'limit must be an integer from 1 to 100',
      );
    },
  );

  it('accepts inclusive canonical UTC detection bounds', async () => {
    const listRecent = jest.fn(() => Promise.resolve([detection()]));
    const controller = new NewListingsController({ listRecent });

    await controller.list(
      '10',
      '2026-09-14T02:00:00.000Z',
      '2026-09-14T03:00:00.000Z',
    );
    expect(listRecent).toHaveBeenCalledWith(
      {
        limit: 10,
        detectedFrom: new Date('2026-09-14T02:00:00.000Z'),
        detectedTo: new Date('2026-09-14T03:00:00.000Z'),
      },
      undefined,
    );
  });

  it.each([
    ['detectedFrom', '2026-09-14'],
    ['detectedTo', '2026-09-14T02:00:00Z'],
  ])('rejects invalid %s', async (field, value) => {
    const controller = new NewListingsController({
      listRecent: jest.fn(() => Promise.resolve([])),
    });
    await expect(
      controller.list(
        undefined,
        field === 'detectedFrom' ? value : undefined,
        field === 'detectedTo' ? value : undefined,
      ),
    ).rejects.toThrow(`${field} must be an ISO 8601 UTC timestamp`);
  });

  it('rejects an inverted detection range', async () => {
    const controller = new NewListingsController({
      listRecent: jest.fn(() => Promise.resolve([])),
    });
    await expect(
      controller.list(
        undefined,
        '2026-09-14T03:00:00.000Z',
        '2026-09-14T02:00:00.000Z',
      ),
    ).rejects.toThrow('detectedFrom must be at or before detectedTo');
  });

  it('accepts a provider and symbol cursor', async () => {
    const listRecent = jest.fn(() => Promise.resolve([]));
    const controller = new NewListingsController({ listRecent });
    await controller.list(undefined, undefined, undefined, 'binance:NEWUSDT');
    expect(listRecent).toHaveBeenCalledWith(
      { limit: 50, detectedFrom: undefined, detectedTo: undefined },
      { provider: 'binance', symbol: 'NEWUSDT' },
    );
  });

  it.each(['invalid', 'BINANCE:NEWUSDT', 'binance:newusdt', 'binance:'])(
    'rejects malformed cursor %s',
    async (cursor) => {
      const controller = new NewListingsController({
        listRecent: jest.fn(() => Promise.resolve([])),
      });
      await expect(
        controller.list(undefined, undefined, undefined, cursor),
      ).rejects.toThrow('cursor must use provider:symbol format');
    },
  );

  it('maps an unknown cursor to bad request', async () => {
    const controller = new NewListingsController({
      listRecent: jest.fn(() =>
        Promise.reject(new DetectedSpotSymbolCursorNotFoundError()),
      ),
    });
    await expect(
      controller.list(undefined, undefined, undefined, 'binance:NEWUSDT'),
    ).rejects.toThrow('cursor must identify a detected symbol');
  });

  it('accepts composable provider state filters', async () => {
    const listRecent = jest.fn(() => Promise.resolve([]));
    const controller = new NewListingsController({ listRecent });
    await controller.list(
      '10',
      undefined,
      undefined,
      undefined,
      'binance',
      'TRADING',
      'true',
    );
    expect(listRecent).toHaveBeenCalledWith(
      {
        limit: 10,
        detectedFrom: undefined,
        detectedTo: undefined,
        provider: 'binance',
        status: 'TRADING',
        spotTradingAllowed: true,
      },
      undefined,
    );
  });

  it.each([
    ['provider', 'other'],
    ['status', 'trading'],
    ['status', ''],
    ['spotTradingAllowed', '1'],
  ])('rejects invalid %s filter', async (field, value) => {
    const controller = new NewListingsController({
      listRecent: jest.fn(() => Promise.resolve([])),
    });
    await expect(
      controller.list(
        undefined,
        undefined,
        undefined,
        undefined,
        field === 'provider' ? value : undefined,
        field === 'status' ? value : undefined,
        field === 'spotTradingAllowed' ? value : undefined,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

function detection(): DetectedSpotSymbol {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    baseAsset: 'NEW',
    quoteAsset: 'USDT',
    status: 'TRADING',
    spotTradingAllowed: true,
    detectedAt: new Date('2026-09-14T02:00:00.000Z'),
    lastObservedAt: new Date('2026-09-14T03:00:00.000Z'),
  };
}
