import { jest } from '@jest/globals';
import { DueListingObservationCheckpointService } from './due-listing-observation-checkpoint.service';

describe('DueListingObservationCheckpointService', () => {
  it('delegates a valid bounded due read', async () => {
    const listDueCheckpoints = jest.fn(() => Promise.resolve([]));
    const service = new DueListingObservationCheckpointService({
      listDueCheckpoints,
      claimDueCheckpoints: jest.fn(),
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
        claimDueCheckpoints: jest.fn(),
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
      claimDueCheckpoints: jest.fn(),
    });
    expect(() => service.listDue(new Date('invalid'), 1)).toThrow(
      'Due checkpoint time must be valid',
    );
    expect(listDueCheckpoints).not.toHaveBeenCalled();
  });

  it('delegates a valid claim', async () => {
    const claimDueCheckpoints = jest.fn(() => Promise.resolve([]));
    const service = new DueListingObservationCheckpointService({
      listDueCheckpoints: jest.fn(),
      claimDueCheckpoints,
    });
    const input = {
      dueAt: new Date('2026-09-14T12:00:00.000Z'),
      limit: 10,
      claimToken: 'worker-1:batch-1',
      claimedAt: new Date('2026-09-14T12:00:01.000Z'),
      claimExpiresAt: new Date('2026-09-14T12:00:31.000Z'),
    };

    await expect(service.claimDue(input)).resolves.toEqual([]);
    expect(claimDueCheckpoints).toHaveBeenCalledWith(input);
  });

  it.each([
    [{ claimToken: '' }, 'Checkpoint claim token must contain'],
    [{ claimToken: 'unsafe token' }, 'Checkpoint claim token must contain'],
    [{ claimedAt: new Date('invalid') }, 'Checkpoint claim time must be valid'],
    [
      { claimExpiresAt: new Date('invalid') },
      'Checkpoint claim expiry must be valid',
    ],
    [
      { claimExpiresAt: new Date('2026-09-14T12:00:01.000Z') },
      'Checkpoint claim expiry must be after claim time',
    ],
  ])(
    'rejects invalid claim input before repository access',
    (change, message) => {
      const claimDueCheckpoints = jest.fn(() => Promise.resolve([]));
      const service = new DueListingObservationCheckpointService({
        listDueCheckpoints: jest.fn(),
        claimDueCheckpoints,
      });
      expect(() =>
        service.claimDue({
          dueAt: new Date('2026-09-14T12:00:00.000Z'),
          limit: 10,
          claimToken: 'worker-1',
          claimedAt: new Date('2026-09-14T12:00:01.000Z'),
          claimExpiresAt: new Date('2026-09-14T12:00:31.000Z'),
          ...change,
        }),
      ).toThrow(message);
      expect(claimDueCheckpoints).not.toHaveBeenCalled();
    },
  );
});
