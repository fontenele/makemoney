export interface PaperMarketBuyQuote {
  symbol: 'BTC/USDT';
  side: 'buy';
  quantity: string;
  price: string;
  notional: string;
  feeRate: string;
  fee: string;
  totalCost: string;
  quotedAt: Date;
  marketDataReceivedAt: Date;
}
