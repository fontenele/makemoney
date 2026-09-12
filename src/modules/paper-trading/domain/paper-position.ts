export interface PaperPosition {
  symbol: 'BTC/USDT';
  quantity: string;
  costBasis: string;
  averageEntryPrice: string | null;
  realizedPnl: string;
  totalFees: string;
  markPrice: string | null;
  grossMarketValue: string;
  estimatedExitFee: string;
  netLiquidationValue: string;
  unrealizedPnl: string;
  totalPnl: string;
  marketDataReceivedAt: Date | null;
}
