export const MOVING_AVERAGE_CROSSOVER_STRATEGY = Symbol(
  'MOVING_AVERAGE_CROSSOVER_STRATEGY',
);

export type StrategyAction = 'buy' | 'sell' | 'hold';

export interface StrategyCandle {
  symbol: 'BTC/USDT';
  interval: '1m';
  closePrice: string;
  openTime: Date;
  closeTime: Date;
  isClosed: boolean;
}

export interface StrategyInput {
  symbol: 'BTC/USDT';
  candles: readonly StrategyCandle[];
  evaluatedAt: Date;
}

export type StrategySignalReason =
  | 'bullish_moving_average_crossover'
  | 'bearish_moving_average_crossover'
  | 'no_moving_average_crossover'
  | 'insufficient_closed_candles';

export interface StrategySignal {
  strategy: 'moving_average_crossover';
  symbol: 'BTC/USDT';
  action: StrategyAction;
  reason: StrategySignalReason;
  shortPeriod: number;
  longPeriod: number;
  previousShortAverage: string | null;
  previousLongAverage: string | null;
  currentShortAverage: string | null;
  currentLongAverage: string | null;
  latestCandleCloseTime: Date | null;
  evaluatedAt: Date;
}

export interface Strategy {
  readonly requiredCandleCount: number;
  analyze(input: StrategyInput): StrategySignal;
}
