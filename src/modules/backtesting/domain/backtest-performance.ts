export interface BacktestPerformance {
  fillCount: number;
  closedTradeCount: number;
  profitableTradeCount: number;
  losingTradeCount: number;
  breakEvenTradeCount: number;
  winRate: string | null;
  grossProfit: string;
  grossLoss: string;
  realizedNetPnl: string;
  totalFees: string;
}
