export interface ListingTopOfBookSpread {
  provider: 'binance';
  symbol: string;
  updateId: string;
  bidPrice: string;
  bidQuantity: string;
  askPrice: string;
  askQuantity: string;
  absoluteSpread: string;
  midPrice: string;
  spreadBasisPoints: string;
  receivedAt: Date;
}
