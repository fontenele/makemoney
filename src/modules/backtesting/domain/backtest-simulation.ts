import { BacktestResult } from './backtest';

interface BacktestFillBase {
  side: 'buy' | 'sell';
  quantity: string;
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
}

export interface BacktestSimulationResult {
  symbol: 'BTC/USDT';
  executionModel: 'next_candle_open';
  quantity: string;
  feeRate: string;
  fills: BacktestFill[];
  closedTrades: BacktestClosedTrade[];
  openPosition: BacktestOpenPosition | null;
  ignoredBuySignalCount: number;
  ignoredSellSignalCount: number;
  unfilledTerminalSignalCount: number;
}

export interface HistoricalBacktestSimulationResult {
  replay: BacktestResult;
  simulation: BacktestSimulationResult;
}
