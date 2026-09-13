export interface BacktestRealizedPnlPoint {
  exitedAt: Date;
  tradeNetPnl: string;
  cumulativeRealizedNetPnl: string;
  peakRealizedNetPnl: string;
  drawdown: string;
}

export interface BacktestMaximumRealizedDrawdown {
  amount: string;
  startedAt: Date | null;
  troughAt: Date | null;
  recoveredAt: Date | null;
}

export interface BacktestRealizedDrawdownResult {
  curve: BacktestRealizedPnlPoint[];
  maximumDrawdown: BacktestMaximumRealizedDrawdown;
}
