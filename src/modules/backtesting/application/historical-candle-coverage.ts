import { Injectable } from '@nestjs/common';
import { HistoricalCandle } from '../domain/historical-candle';
import { HistoricalCandleRequest } from '../domain/historical-candle-provider';

const ONE_MINUTE_MS = 60_000;

@Injectable()
export class HistoricalCandleCoverage {
  expectedOpenTimes(request: HistoricalCandleRequest): number[] {
    const firstOpenTime =
      Math.ceil(request.startTime.getTime() / ONE_MINUTE_MS) * ONE_MINUTE_MS;
    const endTime = request.endTime.getTime();

    if (firstOpenTime > endTime) {
      return [];
    }

    const availableSlots =
      Math.floor((endTime - firstOpenTime) / ONE_MINUTE_MS) + 1;
    const expectedCount = Math.min(availableSlots, request.limit);

    return Array.from(
      { length: expectedCount },
      (_, index) => firstOpenTime + index * ONE_MINUTE_MS,
    );
  }

  isComplete(
    request: HistoricalCandleRequest,
    candles: readonly HistoricalCandle[],
  ): boolean {
    const expectedOpenTimes = this.expectedOpenTimes(request);

    if (candles.length !== expectedOpenTimes.length) {
      return false;
    }

    return candles.every(
      (candle, index) =>
        candle.symbol === request.symbol &&
        candle.interval === request.interval &&
        candle.openTime.getTime() === expectedOpenTimes[index],
    );
  }
}
