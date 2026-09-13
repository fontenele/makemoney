import {
  BacktestMaximumRealizedDrawdown,
  BacktestRealizedPnlPoint,
} from './backtest-drawdown';

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
  averageNetPnlPerClosedTrade: string | null;
  averageProfitableTradeNetPnl: string | null;
  averageLosingTradeNetPnl: string | null;
  expectancy: string | null;
  profitFactor: string | null;
  realizedPnlCurve: BacktestRealizedPnlPoint[];
  maximumRealizedDrawdown: BacktestMaximumRealizedDrawdown;
  unrealizedNetPnl: string | null;
  totalNetPnl: string;
  totalFees: string;
}
