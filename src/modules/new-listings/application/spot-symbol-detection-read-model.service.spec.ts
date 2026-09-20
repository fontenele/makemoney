import { jest } from '@jest/globals';
import { SpotSymbolDetectionReadModelService } from './spot-symbol-detection-read-model.service';
import {
  DetectedSpotSymbolCursorNotFoundError,
  DetectedSpotSymbolNotFoundError,
} from '../domain/spot-symbol-catalog';

describe('SpotSymbolDetectionReadModelService', () => {
  it('loads the durable timeline and calculates price performance', async () => {
    const repository = repositoryWith({
      findDetected: jest.fn(() => Promise.resolve(detection())),
      listCompletedObservations: jest.fn(() =>
        Promise.resolve([completedObservation()]),
      ),
    });
    const service = new SpotSymbolDetectionReadModelService(repository);

    await expect(
      service.getPricePerformance('binance', 'NEWUSDT'),
    ).resolves.toMatchObject({
      symbol: 'NEWUSDT',
      baselinePrice: '100',
      points: [{ priceReturnRate: '0' }],
    });
  });

  it('reports price performance unavailable until T+0 is complete', async () => {
    const repository = repositoryWith({
      findDetected: jest.fn(() => Promise.resolve(detection())),
    });
    const service = new SpotSymbolDetectionReadModelService(repository);

    await expect(
      service.getPricePerformance('binance', 'NEWUSDT'),
    ).resolves.toBeNull();
  });

  it('loads durable performance and classifies an observed pattern', async () => {
    const repository = repositoryWith({
      findDetected: jest.fn(() => Promise.resolve(detection())),
      listCompletedObservations: jest.fn(() =>
        Promise.resolve([
          completedObservation(),
          completedObservation({
            label: 'T+5s',
            offsetMs: 5_000,
            targetAt: new Date('2026-09-14T02:00:05.000Z'),
            completedAt: new Date('2026-09-14T02:00:06.000Z'),
            lastPrice: '125',
          }),
        ]),
      ),
    });
    const service = new SpotSymbolDetectionReadModelService(repository);

    await expect(
      service.getPatternClassification('binance', 'NEWUSDT', {
        pumpReturnRate: '0.2',
        correctionFromPeakRate: '0.25',
      }),
    ).resolves.toMatchObject({
      provider: 'binance',
      symbol: 'NEWUSDT',
      status: 'pump-observed',
      pump: { label: 'T+5s', priceReturnRate: '0.25' },
    });
  });

  it('reports classification unavailable until durable T+0 exists', async () => {
    const service = new SpotSymbolDetectionReadModelService(
      repositoryWith({
        findDetected: jest.fn(() => Promise.resolve(detection())),
      }),
    );

    await expect(
      service.getPatternClassification('binance', 'NEWUSDT', {
        pumpReturnRate: '0.2',
        correctionFromPeakRate: '0.25',
      }),
    ).resolves.toBeNull();
  });

  it('loads a bounded durable cohort and calculates checkpoint performance', async () => {
    const listCompletedObservationCohort = jest.fn(() =>
      Promise.resolve([
        [completedObservation()],
        [
          { ...completedObservation(), symbol: 'OTHERUSDT', lastPrice: '200' },
          completedObservation({
            symbol: 'OTHERUSDT',
            label: 'T+5s',
            offsetMs: 5_000,
            lastPrice: '220',
          }),
        ],
      ]),
    );
    const service = new SpotSymbolDetectionReadModelService(
      repositoryWith({ listCompletedObservationCohort }),
    );

    await expect(service.getCohortPerformance('binance', 25)).resolves.toEqual({
      provider: 'binance',
      detectionCount: 2,
      checkpoints: [
        {
          label: 'T+0',
          offsetMs: 0,
          sampleSize: 2,
          positiveReturnCount: 0,
          negativeReturnCount: 0,
          flatReturnCount: 2,
          averagePriceReturnRate: '0',
        },
        {
          label: 'T+5s',
          offsetMs: 5_000,
          sampleSize: 1,
          positiveReturnCount: 1,
          negativeReturnCount: 0,
          flatReturnCount: 0,
          averagePriceReturnRate: '0.1',
        },
      ],
    });
    expect(listCompletedObservationCohort).toHaveBeenCalledWith('binance', 25);
  });

  it('rejects an invalid cohort limit before repository access', async () => {
    const listCompletedObservationCohort = jest.fn(() => Promise.resolve([]));
    const service = new SpotSymbolDetectionReadModelService(
      repositoryWith({ listCompletedObservationCohort }),
    );

    await expect(service.getCohortPerformance('binance', 0)).rejects.toThrow(
      'cohort limit must be an integer from 1 to 100',
    );
    expect(listCompletedObservationCohort).not.toHaveBeenCalled();
  });

  it('loads a durable cohort and calculates pattern statistics', async () => {
    const listCompletedObservationCohort = jest.fn(() =>
      Promise.resolve([
        [
          completedObservation(),
          completedObservation({
            label: 'T+5s',
            offsetMs: 5_000,
            lastPrice: '125',
          }),
        ],
        [
          completedObservation({ symbol: 'OTHERUSDT', lastPrice: '200' }),
          completedObservation({
            symbol: 'OTHERUSDT',
            label: 'T+5s',
            offsetMs: 5_000,
            lastPrice: '210',
          }),
        ],
      ]),
    );
    const service = new SpotSymbolDetectionReadModelService(
      repositoryWith({ listCompletedObservationCohort }),
    );

    await expect(
      service.getPatternCohort('binance', 25, {
        pumpReturnRate: '0.2',
        correctionFromPeakRate: '0.25',
      }),
    ).resolves.toMatchObject({
      provider: 'binance',
      classificationCount: 2,
      noPumpObservedCount: 1,
      pumpObservedCount: 1,
      correctionObservedCount: 0,
      pumpObservedRate: '0.5',
      correctionObservedRate: '0',
      correctionAmongPumpsRate: '0',
    });
    expect(listCompletedObservationCohort).toHaveBeenCalledWith('binance', 25);
  });

  it('returns an explicit empty durable pattern cohort', async () => {
    const service = new SpotSymbolDetectionReadModelService(repositoryWith());

    await expect(
      service.getPatternCohort('binance', 50, {
        pumpReturnRate: '0.2',
        correctionFromPeakRate: '0.25',
      }),
    ).resolves.toEqual({
      provider: null,
      thresholds: null,
      classificationCount: 0,
      noPumpObservedCount: 0,
      pumpObservedCount: 0,
      correctionObservedCount: 0,
      pumpObservedRate: null,
      correctionObservedRate: null,
      correctionAmongPumpsRate: null,
    });
  });

  it('rejects invalid durable pattern cohort input before repository access', async () => {
    const listCompletedObservationCohort = jest.fn(() => Promise.resolve([]));
    const service = new SpotSymbolDetectionReadModelService(
      repositoryWith({ listCompletedObservationCohort }),
    );

    await expect(
      service.getPatternCohort('binance', 0, {
        pumpReturnRate: '0.2',
        correctionFromPeakRate: '0.25',
      }),
    ).rejects.toThrow('cohort limit must be an integer from 1 to 100');
    await expect(
      service.getPatternCohort('binance', 25, {
        pumpReturnRate: '0',
        correctionFromPeakRate: '0.25',
      }),
    ).rejects.toThrow('pump return rate must be a positive decimal');
    expect(listCompletedObservationCohort).not.toHaveBeenCalled();
  });

  it('loads a durable cohort and calculates pattern magnitude medians', async () => {
    const listCompletedObservationCohort = jest.fn(() =>
      Promise.resolve([
        [
          completedObservation(),
          completedObservation({
            label: 'T+5s',
            offsetMs: 5_000,
            lastPrice: '130',
          }),
        ],
        [
          completedObservation({ symbol: 'OTHERUSDT', lastPrice: '200' }),
          completedObservation({
            symbol: 'OTHERUSDT',
            label: 'T+5s',
            offsetMs: 5_000,
            lastPrice: '250',
          }),
        ],
      ]),
    );
    const service = new SpotSymbolDetectionReadModelService(
      repositoryWith({ listCompletedObservationCohort }),
    );

    await expect(
      service.getPatternMagnitudeCohort('binance', 25, {
        pumpReturnRate: '0.2',
        correctionFromPeakRate: '0.25',
      }),
    ).resolves.toMatchObject({
      provider: 'binance',
      pumpSampleSize: 2,
      correctionSampleSize: 0,
      medianPeakReturnRate: '0.275',
      medianCorrectionFromPeakRate: null,
    });
    expect(listCompletedObservationCohort).toHaveBeenCalledWith('binance', 25);
  });

  it('returns an explicit empty durable pattern magnitude cohort', async () => {
    const service = new SpotSymbolDetectionReadModelService(repositoryWith());

    await expect(
      service.getPatternMagnitudeCohort('binance', 50, {
        pumpReturnRate: '0.2',
        correctionFromPeakRate: '0.25',
      }),
    ).resolves.toEqual({
      provider: null,
      thresholds: null,
      pumpSampleSize: 0,
      correctionSampleSize: 0,
      medianPeakReturnRate: null,
      medianCorrectionFromPeakRate: null,
    });
  });

  it('rejects invalid magnitude cohort input before repository access', async () => {
    const listCompletedObservationCohort = jest.fn(() => Promise.resolve([]));
    const service = new SpotSymbolDetectionReadModelService(
      repositoryWith({ listCompletedObservationCohort }),
    );

    await expect(
      service.getPatternMagnitudeCohort('binance', 101, {
        pumpReturnRate: '0.2',
        correctionFromPeakRate: '0.25',
      }),
    ).rejects.toThrow('cohort limit must be an integer from 1 to 100');
    await expect(
      service.getPatternMagnitudeCohort('binance', 25, {
        pumpReturnRate: '0',
        correctionFromPeakRate: '0.25',
      }),
    ).rejects.toThrow('pump return rate must be a positive decimal');
    expect(listCompletedObservationCohort).not.toHaveBeenCalled();
  });

  it('loads a durable cohort and calculates pattern timing medians', async () => {
    const listCompletedObservationCohort = jest.fn(() =>
      Promise.resolve([
        [
          completedObservation(),
          completedObservation({
            label: 'T+5s',
            offsetMs: 5_000,
            lastPrice: '130',
          }),
          completedObservation({
            label: 'T+10s',
            offsetMs: 10_000,
            lastPrice: '90',
          }),
        ],
      ]),
    );
    const service = new SpotSymbolDetectionReadModelService(
      repositoryWith({ listCompletedObservationCohort }),
    );

    await expect(
      service.getPatternTimingCohort('binance', 25, {
        pumpReturnRate: '0.2',
        correctionFromPeakRate: '0.25',
      }),
    ).resolves.toMatchObject({
      provider: 'binance',
      pumpSampleSize: 1,
      correctionSampleSize: 1,
      medianTimeToPumpMs: 5_000,
      medianTimeFromPeakToCorrectionMs: 5_000,
    });
    expect(listCompletedObservationCohort).toHaveBeenCalledWith('binance', 25);
  });

  it('returns an explicit empty durable pattern timing cohort', async () => {
    const service = new SpotSymbolDetectionReadModelService(repositoryWith());

    await expect(
      service.getPatternTimingCohort('binance', 50, {
        pumpReturnRate: '0.2',
        correctionFromPeakRate: '0.25',
      }),
    ).resolves.toEqual({
      provider: null,
      thresholds: null,
      pumpSampleSize: 0,
      correctionSampleSize: 0,
      medianTimeToPumpMs: null,
      medianTimeFromPeakToCorrectionMs: null,
    });
  });

  it('rejects invalid timing cohort input before repository access', async () => {
    const listCompletedObservationCohort = jest.fn(() => Promise.resolve([]));
    const service = new SpotSymbolDetectionReadModelService(
      repositoryWith({ listCompletedObservationCohort }),
    );

    await expect(
      service.getPatternTimingCohort('binance', 101, {
        pumpReturnRate: '0.2',
        correctionFromPeakRate: '0.25',
      }),
    ).rejects.toThrow('cohort limit must be an integer from 1 to 100');
    await expect(
      service.getPatternTimingCohort('binance', 25, {
        pumpReturnRate: '0',
        correctionFromPeakRate: '0.25',
      }),
    ).rejects.toThrow('pump return rate must be a positive decimal');
    expect(listCompletedObservationCohort).not.toHaveBeenCalled();
  });

  it('loads a durable cohort and calculates checkpoint market activity', async () => {
    const listCompletedObservationCohort = jest.fn(() =>
      Promise.resolve([
        [completedObservation()],
        [
          completedObservation({
            symbol: 'OTHERUSDT',
            baseVolume: '2000',
            quoteVolume: '200000',
            tradeCount: 200,
          }),
          completedObservation({
            symbol: 'OTHERUSDT',
            label: 'T+5s',
            offsetMs: 5_000,
            baseVolume: '3000',
            quoteVolume: '300000',
            tradeCount: 300,
          }),
        ],
      ]),
    );
    const service = new SpotSymbolDetectionReadModelService(
      repositoryWith({ listCompletedObservationCohort }),
    );

    await expect(
      service.getMarketActivityCohort('binance', 25),
    ).resolves.toEqual({
      provider: 'binance',
      detectionCount: 2,
      checkpoints: [
        {
          label: 'T+0',
          offsetMs: 0,
          sampleSize: 2,
          averageBaseVolume: '1500',
          averageQuoteVolume: '150000',
          averageTradeCount: '150',
        },
        {
          label: 'T+5s',
          offsetMs: 5_000,
          sampleSize: 1,
          averageBaseVolume: '3000',
          averageQuoteVolume: '300000',
          averageTradeCount: '300',
        },
      ],
    });
    expect(listCompletedObservationCohort).toHaveBeenCalledWith('binance', 25);
  });

  it('returns an explicit empty durable market activity cohort', async () => {
    const service = new SpotSymbolDetectionReadModelService(repositoryWith());

    await expect(
      service.getMarketActivityCohort('binance', 50),
    ).resolves.toEqual({
      provider: null,
      detectionCount: 0,
      checkpoints: [],
    });
  });

  it('rejects an invalid activity cohort limit before repository access', async () => {
    const listCompletedObservationCohort = jest.fn(() => Promise.resolve([]));
    const service = new SpotSymbolDetectionReadModelService(
      repositoryWith({ listCompletedObservationCohort }),
    );

    await expect(
      service.getMarketActivityCohort('binance', 101),
    ).rejects.toThrow('cohort limit must be an integer from 1 to 100');
    expect(listCompletedObservationCohort).not.toHaveBeenCalled();
  });

  it('lists completed observations only for a durable detection', async () => {
    const observations = [{ label: 'T+0' }];
    const repository = repositoryWith({
      findDetected: jest.fn(() => Promise.resolve(detection())),
      listCompletedObservations: jest.fn(() => Promise.resolve(observations)),
    });
    const service = new SpotSymbolDetectionReadModelService(repository);

    await expect(service.listObservations('binance', 'NEWUSDT')).resolves.toBe(
      observations,
    );
    expect(repository.listCompletedObservations).toHaveBeenCalledWith(
      'binance',
      'NEWUSDT',
    );
  });

  it('rejects observations for an unknown detection', async () => {
    const repository = repositoryWith();
    const service = new SpotSymbolDetectionReadModelService(repository);

    await expect(
      service.listObservations('binance', 'UNKNOWNUSDT'),
    ).rejects.toBeInstanceOf(DetectedSpotSymbolNotFoundError);
    expect(repository.listCompletedObservations).not.toHaveBeenCalled();
  });

  it('delegates filtered aggregate summaries to the repository', async () => {
    const summary = {
      count: 2,
      firstDetectedAt: new Date('2026-09-14T01:00:00.000Z'),
      lastDetectedAt: new Date('2026-09-14T02:00:00.000Z'),
      byStatus: [{ status: 'TRADING', count: 2 }],
      bySpotTradingAllowed: [{ spotTradingAllowed: true, count: 2 }],
    };
    const summarizeDetected = jest.fn(() => Promise.resolve(summary));
    const service = new SpotSymbolDetectionReadModelService({
      summarizeDetected,
    });
    const filters = { status: 'TRADING' };

    await expect(service.summarize(filters)).resolves.toBe(summary);
    expect(summarizeDetected).toHaveBeenCalledWith(filters);
  });

  it('resolves a cursor and passes its immutable sort identity', async () => {
    const cursor = detection();
    const repository = repositoryWith({
      findDetected: jest.fn(() => Promise.resolve(cursor)),
    });
    const service = new SpotSymbolDetectionReadModelService(repository);
    await service.listRecent(
      { limit: 10 },
      {
        provider: 'binance',
        symbol: 'NEWUSDT',
      },
    );
    expect(repository.listDetected).toHaveBeenCalledWith({ limit: 10, cursor });
  });

  it('rejects missing and out-of-range cursors', async () => {
    const missing = new SpotSymbolDetectionReadModelService(repositoryWith());
    await expect(
      missing.listRecent(
        { limit: 10 },
        { provider: 'binance', symbol: 'XUSDT' },
      ),
    ).rejects.toBeInstanceOf(DetectedSpotSymbolCursorNotFoundError);

    const outside = new SpotSymbolDetectionReadModelService(
      repositoryWith({
        findDetected: jest.fn(() => Promise.resolve(detection())),
      }),
    );
    await expect(
      outside.listRecent(
        { limit: 10, detectedFrom: new Date('2026-09-15T00:00:00.000Z') },
        { provider: 'binance', symbol: 'NEWUSDT' },
      ),
    ).rejects.toBeInstanceOf(DetectedSpotSymbolCursorNotFoundError);
  });

  it('rejects a cursor outside the requested provider-state filters', async () => {
    const service = new SpotSymbolDetectionReadModelService(
      repositoryWith({
        findDetected: jest.fn(() => Promise.resolve(detection())),
      }),
    );
    await expect(
      service.listRecent(
        { limit: 10, status: 'BREAK' },
        { provider: 'binance', symbol: 'NEWUSDT' },
      ),
    ).rejects.toBeInstanceOf(DetectedSpotSymbolCursorNotFoundError);
    await expect(
      service.listRecent(
        { limit: 10, spotTradingAllowed: false },
        { provider: 'binance', symbol: 'NEWUSDT' },
      ),
    ).rejects.toBeInstanceOf(DetectedSpotSymbolCursorNotFoundError);
  });
});

function repositoryWith(overrides: Record<string, unknown> = {}) {
  return {
    observe: jest.fn(() => Promise.resolve([])),
    findDetected: jest.fn(() => Promise.resolve(null)),
    listDetected: jest.fn(() => Promise.resolve([])),
    listCompletedObservations: jest.fn(() => Promise.resolve([])),
    listCompletedObservationCohort: jest.fn(() => Promise.resolve([])),
    ...overrides,
  };
}

function detection() {
  return {
    provider: 'binance' as const,
    symbol: 'NEWUSDT',
    baseAsset: 'NEW',
    quoteAsset: 'USDT' as const,
    status: 'TRADING',
    spotTradingAllowed: true,
    detectedAt: new Date('2026-09-14T02:00:00.000Z'),
    lastObservedAt: new Date('2026-09-14T03:00:00.000Z'),
  };
}

function completedObservation(
  overrides: Partial<ReturnType<typeof baseCompletedObservation>> = {},
) {
  return { ...baseCompletedObservation(), ...overrides };
}

function baseCompletedObservation() {
  return {
    provider: 'binance' as const,
    symbol: 'NEWUSDT',
    label: 'T+0' as const,
    offsetMs: 0,
    targetAt: new Date('2026-09-14T02:00:00.000Z'),
    completedAt: new Date('2026-09-14T02:00:01.000Z'),
    lastPrice: '100',
    baseVolume: '1000',
    quoteVolume: '100000',
    tradeCount: 100,
    windowOpenTime: new Date('2026-09-13T02:00:00.000Z'),
    windowCloseTime: new Date('2026-09-14T02:00:00.000Z'),
    receivedAt: new Date('2026-09-14T02:00:01.000Z'),
  };
}
