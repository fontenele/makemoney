export interface MarketPairMetadata {
  provider: 'binance';
  symbol: 'BTC/USDT';
  status: string;
  baseAsset: 'BTC';
  quoteAsset: 'USDT';
  minPrice: string;
  maxPrice: string;
  tickSize: string;
  minQuantity: string;
  maxQuantity: string;
  stepSize: string;
  minNotional: string;
  receivedAt: Date;
}
