import { MarketCandle } from './market-candle';

export const CANDLE_STREAM = Symbol('CANDLE_STREAM');

export interface CandleStream {
  start(onCandle: (candle: MarketCandle) => void): void;
  stop(): void;
}
