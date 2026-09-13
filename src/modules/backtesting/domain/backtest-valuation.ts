export interface BacktestEndingValuation {
  markedAt: Date;
  markPrice: string;
  grossMarketValue: string;
  estimatedExitFee: string;
  netLiquidationValue: string;
  unrealizedNetPnl: string;
}
