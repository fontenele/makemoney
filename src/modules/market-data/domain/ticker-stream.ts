import { MarketTicker } from './market-ticker';

export const TICKER_STREAM = Symbol('TICKER_STREAM');

export interface TickerStream {
  start(onTicker: (ticker: MarketTicker) => void): void;
  stop(): void;
}
