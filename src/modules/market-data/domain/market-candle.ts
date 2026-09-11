export interface MarketCandle {
  provider: 'binance';
  symbol: 'BTC/USDT';
  interval: '1m';
  openPrice: string;
  highPrice: string;
  lowPrice: string;
  closePrice: string;
  baseVolume: string;
  quoteVolume: string;
  takerBuyBaseVolume: string;
  takerBuyQuoteVolume: string;
  tradeCount: number;
  openTime: Date;
  closeTime: Date;
  isClosed: boolean;
  eventTime: Date;
  receivedAt: Date;
}
