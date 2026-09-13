import {
  BacktestBuyFill,
  BacktestOpenPosition,
} from '../domain/backtest-simulation';
import { HistoricalCandle } from '../domain/historical-candle';
import { BacktestEndingValuationCalculator } from './backtest-ending-valuation-calculator';

describe('BacktestEndingValuationCalculator', () => {
  const calculator = new BacktestEndingValuationCalculator();

  it('returns null without an open position', () => {
    expect(calculator.calculate(null, undefined, '0.001')).toBeNull();
  });

  it('marks an open position at the final close including estimated exit fee', () => {
    expect(
      calculator.calculate(position('100.1'), candle('110'), '0.001'),
    ).toEqual({
      markedAt: candle('110').closeTime,
      markPrice: '110',
      grossMarketValue: '110',
      estimatedExitFee: '0.11',
      netLiquidationValue: '109.89',
      unrealizedNetPnl: '9.79',
    });
  });

  it('preserves deterministic arbitrary precision', () => {
    const result = calculator.calculate(
      position('0.123456789012345678901234567890123456789'),
      candle('0.987654321098765432109876543210987654321'),
      '0.0001',
    );

    expect(result?.netLiquidationValue).toBe(
      '0.9875555556666555555666655555566665555556',
    );
  });

  it('rejects an inconsistent open position without a final candle', () => {
    expect(() => calculator.calculate(position('100'), undefined, '0')).toThrow(
      'An open backtest position requires a final candle',
    );
  });
});

function position(costBasis: string): BacktestOpenPosition {
  const entry: BacktestBuyFill = {
    side: 'buy',
    quantity: '1',
    price: '100',
    notional: '100',
    feeRate: '0.001',
    fee: '0.1',
    totalCost: costBasis,
    signalTime: new Date(0),
    filledAt: new Date(1),
  };
  return { entry, quantity: '1', costBasis };
}

function candle(closePrice: string): HistoricalCandle {
  return {
    symbol: 'BTC/USDT',
    interval: '1m',
    openPrice: closePrice,
    highPrice: closePrice,
    lowPrice: closePrice,
    closePrice,
    baseVolume: '1',
    quoteVolume: '1',
    takerBuyBaseVolume: '0.5',
    takerBuyQuoteVolume: '0.5',
    tradeCount: 1,
    openTime: new Date(0),
    closeTime: new Date(59_999),
    isClosed: true,
  };
}
