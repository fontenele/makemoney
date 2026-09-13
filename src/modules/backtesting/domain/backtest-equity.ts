export interface BacktestEquityPoint {
  markedAt: Date;
  markPrice: string;
  cashUsdt: string;
  openQuantityBtc: string;
  positionNetValueUsdt: string;
  equityUsdt: string;
  peakEquityUsdt: string;
  drawdownUsdt: string;
  drawdownRate: string;
}

export interface BacktestEquityDrawdown {
  amountUsdt: string;
  rate: string;
  startedAt: Date | null;
  troughAt: Date | null;
  recoveredAt: Date | null;
}

export interface BacktestEquityResult {
  curve: BacktestEquityPoint[];
  maximumAbsoluteDrawdown: BacktestEquityDrawdown;
  maximumPercentageDrawdown: BacktestEquityDrawdown;
}
