import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { jest } from '@jest/globals';
import { PaperExecutionHistoryService } from '../application/paper-execution-history.service';
import {
  PaperPositionService,
  PositionMarketDataStaleError,
  PositionMarketDataUnavailableError,
} from '../application/paper-position.service';
import { PaperTradingController } from './paper-trading.controller';

describe('PaperTradingController', () => {
  it('uses the default limit when it is omitted', async () => {
    const listRecent = jest.fn<PaperExecutionHistoryService['listRecent']>();
    listRecent.mockResolvedValue([]);
    const controller = new PaperTradingController(
      {
        listRecent,
      } as unknown as PaperExecutionHistoryService,
      {} as PaperPositionService,
    );

    await expect(controller.listExecutions()).resolves.toEqual([]);
    expect(listRecent).toHaveBeenCalledWith(50);
  });

  it('passes a valid explicit limit', async () => {
    const listRecent = jest.fn<PaperExecutionHistoryService['listRecent']>();
    listRecent.mockResolvedValue([]);
    const controller = new PaperTradingController(
      {
        listRecent,
      } as unknown as PaperExecutionHistoryService,
      {} as PaperPositionService,
    );

    await expect(controller.listExecutions('2')).resolves.toEqual([]);
    expect(listRecent).toHaveBeenCalledWith(2);
  });

  it.each(['0', '101', '1.5', 'abc'])('rejects invalid limit %s', (limit) => {
    const controller = new PaperTradingController(
      {
        listRecent: jest.fn(),
      } as unknown as PaperExecutionHistoryService,
      {} as PaperPositionService,
    );

    expect(() => controller.listExecutions(limit)).toThrow(BadRequestException);
  });

  it('returns the calculated paper position', async () => {
    const position = {
      symbol: 'BTC/USDT' as const,
      quantity: '0.001',
      costBasis: '50.05',
      averageEntryPrice: '50050',
      realizedPnl: '0',
      totalFees: '0.05',
      markPrice: '51000',
      grossMarketValue: '51',
      estimatedExitFee: '0.051',
      netLiquidationValue: '50.949',
      unrealizedPnl: '0.899',
      totalPnl: '0.899',
      marketDataReceivedAt: new Date(0),
    };
    const getPosition = jest.fn<PaperPositionService['getPosition']>();
    getPosition.mockResolvedValue(position);
    const controller = new PaperTradingController(
      {} as PaperExecutionHistoryService,
      { getPosition } as unknown as PaperPositionService,
    );

    await expect(controller.getPosition()).resolves.toBe(position);
  });

  it.each([
    new PositionMarketDataUnavailableError(),
    new PositionMarketDataStaleError(10001, 10000),
  ])('maps position market-data errors to HTTP 503', async (error) => {
    const getPosition = jest.fn<PaperPositionService['getPosition']>();
    getPosition.mockRejectedValue(error);
    const controller = new PaperTradingController(
      {} as PaperExecutionHistoryService,
      { getPosition } as unknown as PaperPositionService,
    );

    await expect(controller.getPosition()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
