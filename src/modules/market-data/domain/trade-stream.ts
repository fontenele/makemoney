import { MarketTrade } from './market-trade';

export const TRADE_STREAM = Symbol('TRADE_STREAM');

export interface TradeStream {
  start(onTrade: (trade: MarketTrade) => void): void;
  stop(): void;
}
