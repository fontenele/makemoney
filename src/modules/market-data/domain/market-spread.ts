export interface MarketSpread {
  provider: 'binance';
  symbol: 'BTC/USDT';
  updateId: string;
  bidPrice: string;
  askPrice: string;
  absoluteSpread: string;
  midPrice: string;
  spreadBasisPoints: string;
  receivedAt: Date;
}
