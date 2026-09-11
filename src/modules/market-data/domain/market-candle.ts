export interface MarketCandle {
  provider: 'binance';
  symbol: 'BTC/USDT';
  interval: '1m';
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  closePrice: string;
  openTime: Date;
  closeTime: Date;
  isClosed: boolean;
  eventTime: Date;
  receivedAt: Date;
}
