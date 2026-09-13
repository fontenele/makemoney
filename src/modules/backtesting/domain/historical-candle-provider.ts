import { StrategyCandle } from '../../strategies/domain/strategy';

export const HISTORICAL_CANDLE_PROVIDER = Symbol('HISTORICAL_CANDLE_PROVIDER');

export interface HistoricalCandleRequest {
  symbol: 'BTC/USDT';
  interval: '1m';
  startTime: Date;
  endTime: Date;
  limit: number;
}

export interface HistoricalCandleProvider {
  load(
    request: HistoricalCandleRequest,
    signal?: AbortSignal,
  ): Promise<StrategyCandle[]>;
}
