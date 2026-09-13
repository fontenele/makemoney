export interface BacktestClosedTradeDuration {
  enteredAt: Date;
  exitedAt: Date;
  durationMs: number;
}

export interface BacktestTimeMetrics {
  periodStartedAt: Date | null;
  periodEndedAt: Date | null;
  periodDurationMs: number;
  timeInMarketMs: number;
  exposureRate: string | null;
  closedTradeHoldingDurations: BacktestClosedTradeDuration[];
  averageClosedTradeHoldingDurationMs: string | null;
}
