import { HistoricalCandle } from '../domain/historical-candle';
import { BacktestLiquidityCalculator } from './backtest-liquidity-calculator';

describe('BacktestLiquidityCalculator', () => {
  const calculator = new BacktestLiquidityCalculator();

  it('permits quantity exactly at the participation limit', () => {
    const reference = candle('10');
    expect(calculator.calculate('1', reference, '0.1')).toEqual({
      referenceCandleCloseTime: reference.closeTime,
      referenceBaseVolume: '10',
      maximumFillQuantity: '1',
      permitted: true,
    });
  });

  it('rejects quantity above the participation limit', () => {
    expect(calculator.calculate('1.0001', candle('10'), '0.1')).toMatchObject({
      maximumFillQuantity: '1',
      permitted: false,
    });
  });

  it('rejects any positive quantity when reference volume is zero', () => {
    expect(calculator.calculate('0.1', candle('0'), '1')).toMatchObject({
      maximumFillQuantity: '0',
      permitted: false,
    });
  });

  it('preserves arbitrary decimal precision', () => {
    expect(
      calculator.calculate(
        '0.01524157875323883675019051998750190521',
        candle('0.1234567890123456789'),
        '0.1234567890123456789',
      ),
    ).toMatchObject({
      maximumFillQuantity: '0.01524157875323883675019051998750190521',
      permitted: true,
    });
  });
});

function candle(baseVolume: string): HistoricalCandle {
  return {
    symbol: 'BTC/USDT',
    interval: '1m',
    openPrice: '100',
    highPrice: '100',
    lowPrice: '100',
    closePrice: '100',
    baseVolume,
    quoteVolume: '100',
    takerBuyBaseVolume: '0',
    takerBuyQuoteVolume: '0',
    tradeCount: 1,
    openTime: new Date(0),
    closeTime: new Date(59_999),
    isClosed: true,
  };
}
