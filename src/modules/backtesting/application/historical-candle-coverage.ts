import { Injectable } from '@nestjs/common';
import { HistoricalCandle } from '../domain/historical-candle';
import { HistoricalCandleRequest } from '../domain/historical-candle-provider';

const ONE_MINUTE_MS = 60_000;

@Injectable()
export class HistoricalCandleCoverage {
  isComplete(
    request: HistoricalCandleRequest,
    candles: readonly HistoricalCandle[],
  ): boolean {
    const firstOpenTime =
      Math.ceil(request.startTime.getTime() / ONE_MINUTE_MS) * ONE_MINUTE_MS;
    const endTime = request.endTime.getTime();

    if (firstOpenTime > endTime) {
      return candles.length === 0;
    }

    const availableSlots =
      Math.floor((endTime - firstOpenTime) / ONE_MINUTE_MS) + 1;
    const expectedCount = Math.min(availableSlots, request.limit);

    if (candles.length !== expectedCount) {
      return false;
    }

    return candles.every(
      (candle, index) =>
        candle.symbol === request.symbol &&
        candle.interval === request.interval &&
        candle.openTime.getTime() === firstOpenTime + index * ONE_MINUTE_MS,
    );
  }
}
