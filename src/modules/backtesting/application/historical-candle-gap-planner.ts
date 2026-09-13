import { Injectable } from '@nestjs/common';
import { HistoricalCandle } from '../domain/historical-candle';
import { HistoricalCandleRequest } from '../domain/historical-candle-provider';
import { HistoricalCandleCoverage } from './historical-candle-coverage';

const ONE_MINUTE_MS = 60_000;

@Injectable()
export class HistoricalCandleGapPlanner {
  constructor(private readonly coverage: HistoricalCandleCoverage) {}

  plan(
    request: HistoricalCandleRequest,
    storedCandles: readonly HistoricalCandle[],
  ): HistoricalCandleRequest[] {
    const storedOpenTimes = new Set(
      storedCandles.map((candle) => candle.openTime.getTime()),
    );
    const missingOpenTimes = this.coverage
      .expectedOpenTimes(request)
      .filter((openTime) => !storedOpenTimes.has(openTime));

    const gaps: HistoricalCandleRequest[] = [];
    for (const openTime of missingOpenTimes) {
      const previous = gaps.at(-1);
      if (previous && previous.endTime.getTime() + ONE_MINUTE_MS === openTime) {
        previous.endTime = new Date(openTime);
        previous.limit += 1;
      } else {
        gaps.push({
          symbol: request.symbol,
          interval: request.interval,
          startTime: new Date(openTime),
          endTime: new Date(openTime),
          limit: 1,
        });
      }
    }
    return gaps;
  }
}
