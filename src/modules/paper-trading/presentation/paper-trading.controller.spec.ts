import { BadRequestException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { PaperExecutionHistoryService } from '../application/paper-execution-history.service';
import { PaperTradingController } from './paper-trading.controller';

describe('PaperTradingController', () => {
  it('uses the default limit when it is omitted', async () => {
    const listRecent = jest.fn<PaperExecutionHistoryService['listRecent']>();
    listRecent.mockResolvedValue([]);
    const controller = new PaperTradingController({
      listRecent,
    } as unknown as PaperExecutionHistoryService);

    await expect(controller.listExecutions()).resolves.toEqual([]);
    expect(listRecent).toHaveBeenCalledWith(50);
  });

  it('passes a valid explicit limit', async () => {
    const listRecent = jest.fn<PaperExecutionHistoryService['listRecent']>();
    listRecent.mockResolvedValue([]);
    const controller = new PaperTradingController({
      listRecent,
    } as unknown as PaperExecutionHistoryService);

    await expect(controller.listExecutions('2')).resolves.toEqual([]);
    expect(listRecent).toHaveBeenCalledWith(2);
  });

  it.each(['0', '101', '1.5', 'abc'])('rejects invalid limit %s', (limit) => {
    const controller = new PaperTradingController({
      listRecent: jest.fn(),
    } as unknown as PaperExecutionHistoryService);

    expect(() => controller.listExecutions(limit)).toThrow(BadRequestException);
  });
});
