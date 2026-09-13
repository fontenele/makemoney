import {
  BacktestBuyFill,
  BacktestSellFill,
} from '../domain/backtest-simulation';
import { HistoricalCandle } from '../domain/historical-candle';
import { BacktestEquityCalculator } from './backtest-equity-calculator';

describe('BacktestEquityCalculator', () => {
  const calculator = new BacktestEquityCalculator();

  it('keeps initial equity across candles without fills', () => {
    const result = calculator.calculate(
      [candle(0, '100')],
      [],
      '1000',
      '0.001',
    );
    expect(result.curve[0]).toMatchObject({
      cashUsdt: '1000',
      openQuantityBtc: '0',
      positionNetValueUsdt: '0',
      equityUsdt: '1000',
      peakEquityUsdt: '1000',
      drawdownUsdt: '0',
      drawdownRate: '0',
    });
    expect(result.maximumPercentageDrawdown.rate).toBe('0');
  });

  it('applies an opening fill before close marking and measures recovery', () => {
    const candles = [candle(0, '100'), candle(1, '90'), candle(2, '110')];
    const buy = buyFill(candles[0], '100');
    const result = calculator.calculate(candles, [buy], '200', '0');

    expect(result.curve.map((point) => point.equityUsdt)).toEqual([
      '200',
      '190',
      '210',
    ]);
    expect(result.maximumAbsoluteDrawdown).toEqual({
      amountUsdt: '10',
      rate: '0.05',
      startedAt: candles[1]?.closeTime,
      troughAt: candles[1]?.closeTime,
      recoveredAt: candles[2]?.closeTime,
    });
  });

  it('applies a sell at candle open before marking that close', () => {
    const candles = [candle(0, '100'), candle(1, '105')];
    const buy = buyFill(candles[0], '100');
    const sell = sellFill(candles[1], '105');
    const result = calculator.calculate(candles, [buy, sell], '200', '0');

    expect(result.curve[1]).toMatchObject({
      cashUsdt: '205',
      openQuantityBtc: '0',
      positionNetValueUsdt: '0',
      equityUsdt: '205',
    });
  });

  it('preserves arbitrary precision with fee-adjusted valuation', () => {
    const value = '0.123456789012345678901234567890123456789';
    const current = candle(0, value);
    const result = calculator.calculate(
      [current],
      [buyFill(current, value)],
      '1',
      '0.0001',
    );
    expect(result.curve[0]?.equityUsdt).toBe(
      '0.9999876543210987654321098765432109876543',
    );
  });
});

function candle(index: number, closePrice: string): HistoricalCandle {
  const openTime = new Date(index * 60_000);
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
    openTime,
    closeTime: new Date(openTime.getTime() + 59_999),
    isClosed: true,
  };
}

function buyFill(candle: HistoricalCandle, price: string): BacktestBuyFill {
  return {
    side: 'buy',
    quantity: '1',
    referencePrice: price,
    price,
    notional: price,
    feeRate: '0',
    fee: '0',
    totalCost: price,
    signalTime: candle.openTime,
    filledAt: candle.openTime,
  };
}

function sellFill(candle: HistoricalCandle, price: string): BacktestSellFill {
  return {
    side: 'sell',
    quantity: '1',
    referencePrice: price,
    price,
    notional: price,
    feeRate: '0',
    fee: '0',
    netProceeds: price,
    signalTime: candle.openTime,
    filledAt: candle.openTime,
  };
}
