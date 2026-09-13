import { HistoricalCandle } from './historical-candle';

export const HISTORICAL_CANDLE_REPOSITORY = Symbol(
  'HISTORICAL_CANDLE_REPOSITORY',
);

export interface HistoricalCandleRepository {
  saveMany(candles: readonly HistoricalCandle[]): Promise<void>;
}
