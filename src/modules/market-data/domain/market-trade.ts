export type TradeSide = 'buy' | 'sell';

export interface MarketTrade {
  provider: 'binance';
  symbol: 'BTC/USDT';
  tradeId: string;
  price: string;
  quantity: string;
  takerSide: TradeSide;
  eventTime: Date;
  tradeTime: Date;
  receivedAt: Date;
}
