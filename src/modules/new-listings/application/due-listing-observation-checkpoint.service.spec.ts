import { jest } from '@jest/globals';
import { DueListingObservationCheckpointService } from './due-listing-observation-checkpoint.service';

describe('DueListingObservationCheckpointService', () => {
  it('delegates a valid bounded due read', async () => {
    const listDueCheckpoints = jest.fn(() => Promise.resolve([]));
    const service = new DueListingObservationCheckpointService({
      listDueCheckpoints,
    });
    const dueAt = new Date('2026-09-14T12:00:00.000Z');

    await expect(service.listDue(dueAt, 100)).resolves.toEqual([]);
    expect(listDueCheckpoints).toHaveBeenCalledWith(dueAt, 100);
  });

  it.each([0, -1, 1.5, 101, Number.NaN])(
    'rejects invalid limit %s before repository access',
    (limit) => {
      const listDueCheckpoints = jest.fn(() => Promise.resolve([]));
      const service = new DueListingObservationCheckpointService({
        listDueCheckpoints,
      });
      expect(() => service.listDue(new Date(), limit)).toThrow(
        'Due checkpoint limit must be an integer from 1 to 100',
      );
      expect(listDueCheckpoints).not.toHaveBeenCalled();
    },
  );

  it('rejects an invalid due time before repository access', () => {
    const listDueCheckpoints = jest.fn(() => Promise.resolve([]));
    const service = new DueListingObservationCheckpointService({
      listDueCheckpoints,
    });
    expect(() => service.listDue(new Date('invalid'), 1)).toThrow(
      'Due checkpoint time must be valid',
    );
    expect(listDueCheckpoints).not.toHaveBeenCalled();
  });
});
