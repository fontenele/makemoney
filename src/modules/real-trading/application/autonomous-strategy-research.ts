import Decimal from 'decimal.js';
import { HistoricalCandle } from '../../backtesting/domain/historical-candle';
import { Strategy } from '../../strategies/domain/strategy';

const Exact = Decimal.clone({ precision: 80, toExpNeg: -80, toExpPos: 80 });

/** Descriptive BTC spot research. Neither a BTCB forecast nor execution authority. */
export function researchStrategyReturns(
  candles: readonly HistoricalCandle[],
  strategy: Strategy,
) {
  if (candles.length > 1000)
    throw new Error('Research window exceeds its bound');
  let previousClose = -Infinity;
  for (const candle of candles) {
    if (
      candle.symbol !== 'BTC/USDT' ||
      candle.interval !== '1m' ||
      !candle.isClosed ||
      !Number.isFinite(candle.openTime.getTime()) ||
      !Number.isFinite(candle.closeTime.getTime()) ||
      candle.closeTime.getTime() - candle.openTime.getTime() !== 59999 ||
      (previousClose !== -Infinity &&
        candle.openTime.getTime() !== previousClose + 1) ||
      !/^(?:[1-9]\d{0,29}|0)(?:\.\d{1,30})?$/.test(candle.openPrice) ||
      !new Exact(candle.openPrice).gt(0)
    )
      throw new Error('Research requires contiguous valid closed candles');
    previousClose = candle.closeTime.getTime();
  }
  const history: HistoricalCandle[] = [];
  const returns: Decimal[] = [];
  let entry: Decimal | null = null;
  let pending: 'buy' | 'sell' | 'hold' = 'hold';
  let latestAction: 'buy' | 'sell' | 'hold' = 'hold';
  for (const candle of candles) {
    // A signal from the preceding close can only fill at the next open.
    if (pending === 'buy' && entry === null)
      entry = new Exact(candle.openPrice);
    if (pending === 'sell' && entry !== null) {
      returns.push(new Exact(candle.openPrice).div(entry).minus(1));
      entry = null;
    }
    history.push(candle);
    if (history.length > strategy.requiredCandleCount) history.shift();
    latestAction = strategy.analyze({
      symbol: 'BTC/USDT',
      candles: [...history],
      evaluatedAt: candle.closeTime,
    }).action;
    pending = latestAction;
  }
  const mean = returns.length
    ? returns
        .reduce((sum, value) => sum.plus(value), new Exact(0))
        .div(returns.length)
    : null;
  const ordered = [...returns].sort((a, b) => a.comparedTo(b));
  const lowerQuartile = ordered.length
    ? ordered[Math.floor((ordered.length - 1) / 4)]
    : null;
  return {
    symbol: 'BTC/USDT' as const,
    strategy: 'moving_average_crossover' as const,
    candleCount: candles.length,
    closedTradeCount: returns.length,
    latestAction,
    openHypotheticalPosition: entry !== null,
    grossMeanReturnRate:
      mean?.toDecimalPlaces(18, Decimal.ROUND_FLOOR).toFixed() ?? null,
    grossLowerQuartileReturnRate:
      lowerQuartile?.toDecimalPlaces(18, Decimal.ROUND_FLOOR).toFixed() ?? null,
    startedAt: candles[0]?.openTime ?? null,
    endedAt: candles.at(-1)?.closeTime ?? null,
    costCoverage: 'gross_before_fees_spread_slippage_gas' as const,
    executionModel: 'next_candle_open' as const,
    btcbExecutionEdgeVerified: false as const,
    expectedProfitVerified: false as const,
    submissionAuthorized: false as const,
    riskApproved: false as const,
  };
}
