export interface MarketTopOfBook {
  provider: 'binance';
  symbol: 'BTC/USDT';
  updateId: string;
  bidPrice: string;
  bidQuantity: string;
  askPrice: string;
  askQuantity: string;
  receivedAt: Date;
}
