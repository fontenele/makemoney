import { valuePaperPosition } from './paper-position-valuation';

const openPosition = {
  symbol: 'BTC/USDT' as const,
  quantity: '0.002',
  costBasis: '100.1',
  averageEntryPrice: '50050',
  realizedPnl: '3.2',
  totalFees: '0.1',
};

describe('valuePaperPosition', () => {
  it('values an open position at net best-bid liquidation proceeds', () => {
    const receivedAt = new Date('2026-09-11T12:00:00.000Z');

    expect(
      valuePaperPosition(openPosition, '55000', '0.001', receivedAt),
    ).toEqual({
      ...openPosition,
      markPrice: '55000',
      grossMarketValue: '110',
      estimatedExitFee: '0.11',
      netLiquidationValue: '109.89',
      unrealizedPnl: '9.79',
      totalPnl: '12.99',
      marketDataReceivedAt: receivedAt,
    });
  });

  it('reports a net unrealized loss including the estimated exit fee', () => {
    expect(
      valuePaperPosition(openPosition, '49000', '0.001', new Date(0)),
    ).toMatchObject({
      grossMarketValue: '98',
      estimatedExitFee: '0.098',
      netLiquidationValue: '97.902',
      unrealizedPnl: '-2.198',
      totalPnl: '1.002',
    });
  });

  it('does not require market data for an empty position', () => {
    expect(
      valuePaperPosition(
        {
          ...openPosition,
          quantity: '0',
          costBasis: '0',
          averageEntryPrice: null,
        },
        null,
        '0.001',
        null,
      ),
    ).toMatchObject({
      markPrice: null,
      grossMarketValue: '0',
      estimatedExitFee: '0',
      netLiquidationValue: '0',
      unrealizedPnl: '0',
      totalPnl: '3.2',
      marketDataReceivedAt: null,
    });
  });
});
