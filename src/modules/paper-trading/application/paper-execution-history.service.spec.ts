import { jest } from '@jest/globals';
import { PaperExecutionRepository } from '../domain/paper-execution-repository';
import { PaperExecutionHistoryService } from './paper-execution-history.service';

describe('PaperExecutionHistoryService', () => {
  it('requests the default bounded history', async () => {
    const listRecent = jest.fn<PaperExecutionRepository['listRecent']>();
    listRecent.mockResolvedValue([]);
    const service = new PaperExecutionHistoryService({
      listRecent,
    } as unknown as PaperExecutionRepository);

    await expect(service.listRecent()).resolves.toEqual([]);
    expect(listRecent).toHaveBeenCalledWith(50);
  });

  it.each([0, 101, 1.5])('rejects invalid limit %s', (limit) => {
    const service = new PaperExecutionHistoryService(
      {} as PaperExecutionRepository,
    );

    expect(() => service.listRecent(limit)).toThrow(
      'Execution history limit must be an integer from 1 to 100',
    );
  });
});
