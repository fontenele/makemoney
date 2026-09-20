import { jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { DetectedSpotSymbol } from '../domain/spot-symbol-catalog';
import {
  DetectedSpotSymbolCursorNotFoundError,
  DetectedSpotSymbolNotFoundError,
} from '../domain/spot-symbol-catalog';
import { NewListingsController } from './new-listings.controller';

describe('NewListingsController', () => {
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

  it('returns the completed observation timeline for a detected symbol', async () => {
    const listObservations = jest.fn(() => Promise.resolve([]));
    const controller = new NewListingsController({ listObservations });

    await expect(
      controller.observations('binance', 'NEWUSDT'),
    ).resolves.toEqual([]);
    expect(listObservations).toHaveBeenCalledWith('binance', 'NEWUSDT');
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
