export interface PaperMarketSellQuote {
  symbol: 'BTC/USDT';
  side: 'sell';
  quantity: string;
  topOfBookAvailableQuantity: string;
  price: string;
  notional: string;
  feeRate: string;
  fee: string;
  netProceeds: string;
  quotedAt: Date;
  marketDataReceivedAt: Date;
}
