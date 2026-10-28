import { CompletedListingObservationCheckpoint } from '../domain/listing-observation-schedule';
import { ListingObservationCheckpointLatencyCohortCalculator } from './listing-observation-checkpoint-latency-cohort-calculator';

describe('ListingObservationCheckpointLatencyCohortCalculator', () => {
  const calculator = new ListingObservationCheckpointLatencyCohortCalculator();

  it('reports independent canonical checkpoint latency distributions', () => {
    const result = calculator.calculate([
      [
        checkpoint('AUSDT', 'T+0', 0, 100),
        checkpoint('AUSDT', 'T+5s', 5_000, 900),
      ],
      [
        checkpoint('BUSDT', 'T+0', 0, 200),
        checkpoint('BUSDT', 'T+5s', 5_000, 300),
      ],
      [checkpoint('CUSDT', 'T+0', 0, 400)],
      [checkpoint('DUSDT', 'T+0', 0, 800)],
    ]);

    expect(result.provider).toBe('binance');
    expect(result.detectionCount).toBe(4);
    expect(result.checkpoints).toHaveLength(9);
    expect(result.checkpoints[0]).toEqual({
      label: 'T+0',
      offsetMs: 0,
      sampleSize: 4,
      minimumLagMs: 100,
      medianLagMs: 300,
      percentile95LagMs: 800,
      maximumLagMs: 800,
    });
    expect(result.checkpoints[1]).toEqual({
      label: 'T+5s',
      offsetMs: 5_000,
      sampleSize: 2,
      minimumLagMs: 300,
      medianLagMs: 600,
      percentile95LagMs: 900,
      maximumLagMs: 900,
    });
    expect(result.checkpoints[8]).toEqual({
      label: 'T+24h',
      offsetMs: 86_400_000,
      sampleSize: 0,
      minimumLagMs: null,
      medianLagMs: null,
      percentile95LagMs: null,
      maximumLagMs: null,
    });
  });

  it('returns an explicit empty cohort', () => {
    expect(calculator.calculate([])).toEqual({
      provider: null,
      detectionCount: 0,
      checkpoints: [],
    });
  });

  it.each([
    [[checkpoint('AUSDT', 'T+0', 1, 100)]],
    [[checkpoint('AUSDT', 'T+0', 0, -1)]],
    [[checkpoint('AUSDT', 'T+0', 0, 100), checkpoint('AUSDT', 'T+0', 0, 200)]],
    [
      [checkpoint('AUSDT', 'T+0', 0, 100)],
      [checkpoint('AUSDT', 'T+0', 0, 200)],
    ],
  ])('rejects malformed durable timelines', (...timelines) => {
    expect(() => calculator.calculate(timelines)).toThrow();
  });
});

function checkpoint(
  symbol: string,
  label: 'T+0' | 'T+5s',
  offsetMs: number,
  lagMs: number,
): CompletedListingObservationCheckpoint {
  const targetAt = new Date(1_800_000_000_000 + offsetMs);
  return {
    provider: 'binance',
    symbol,
    label,
    offsetMs,
    targetAt,
    completedAt: new Date(targetAt.getTime() + lagMs),
    lastPrice: '1',
    baseVolume: '1',
    quoteVolume: '1',
    tradeCount: 1,
    windowOpenTime: new Date(1_799_999_000_000),
    windowCloseTime: new Date(1_800_000_000_000),
    receivedAt: new Date(targetAt.getTime() + lagMs),
  };
}
