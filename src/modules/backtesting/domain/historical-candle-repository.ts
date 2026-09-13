import { HistoricalCandle } from './historical-candle';
import { HistoricalCandleRequest } from './historical-candle-provider';

export const HISTORICAL_CANDLE_REPOSITORY = Symbol(
  'HISTORICAL_CANDLE_REPOSITORY',
);

export interface HistoricalCandleRepository {
  saveMany(candles: readonly HistoricalCandle[]): Promise<void>;
  findRange(request: HistoricalCandleRequest): Promise<HistoricalCandle[]>;
}
