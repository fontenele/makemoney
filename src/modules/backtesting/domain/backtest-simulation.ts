import { BacktestResult } from './backtest';
import { BacktestPerformance } from './backtest-performance';
import { BacktestEndingValuation } from './backtest-valuation';
import { BacktestEquityResult } from './backtest-equity';
import { BacktestTimeMetrics } from './backtest-time-metrics';
import { BacktestExecutionRules } from './backtest-execution-rules';

interface BacktestFillBase {
  side: 'buy' | 'sell';
  quantity: string;
  referencePrice: string;
  adjustedPrice: string;
  price: string;
  notional: string;
  feeRate: string;
  fee: string;
  signalTime: Date;
  filledAt: Date;
}

export interface BacktestBuyFill extends BacktestFillBase {
  side: 'buy';
  totalCost: string;
}

export interface BacktestSellFill extends BacktestFillBase {
  side: 'sell';
  netProceeds: string;
}

export type BacktestFill = BacktestBuyFill | BacktestSellFill;

export interface BacktestClosedTrade {
  entry: BacktestBuyFill;
  exit: BacktestSellFill;
  netPnl: string;
}

export interface BacktestOpenPosition {
  entry: BacktestBuyFill;
  quantity: string;
  costBasis: string;
}

export interface BacktestSimulationConfiguration {
  quantity: string;
  feeRate: string;
  spreadRate: string;
  slippageRate: string;
  initialCapitalUsdt: string;
  executionRules: BacktestExecutionRules;
}

export interface BacktestCapitalResult {
  initialCapitalUsdt: string;
  finalCashUsdt: string;
  endingPositionNetValueUsdt: string;
  finalEquityUsdt: string;
  totalNetReturnUsdt: string;
  totalRoi: string;
}

export interface BacktestSimulationResult {
  symbol: 'BTC/USDT';
  executionModel: 'next_candle_open';
  quantity: string;
  feeRate: string;
  spreadRate: string;
  slippageRate: string;
  executionRules: BacktestExecutionRules;
  capital: BacktestCapitalResult;
  equity: BacktestEquityResult;
  timeMetrics: BacktestTimeMetrics;
  fills: BacktestFill[];
  closedTrades: BacktestClosedTrade[];
  performance: BacktestPerformance;
  openPosition: BacktestOpenPosition | null;
  endingValuation: BacktestEndingValuation | null;
  ignoredBuySignalCount: number;
  ignoredSellSignalCount: number;
  insufficientCapitalBuySignalCount: number;
  minimumNotionalUnfilledSignalCount: number;
  pricePrecisionUnfilledSignalCount: number;
  unfilledTerminalSignalCount: number;
}

export interface HistoricalBacktestSimulationResult {
  replay: BacktestResult;
  simulation: BacktestSimulationResult;
}
