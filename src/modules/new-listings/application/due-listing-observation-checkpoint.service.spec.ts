import { jest } from '@jest/globals';
import { DueListingObservationCheckpointService } from './due-listing-observation-checkpoint.service';

describe('DueListingObservationCheckpointService', () => {
  it('delegates a valid bounded due read', async () => {
    const listDueCheckpoints = jest.fn(() => Promise.resolve([]));
    const service = new DueListingObservationCheckpointService({
      listDueCheckpoints,
      claimDueCheckpoints: jest.fn(),
      completeClaimedCheckpoint: jest.fn(),
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
        completeClaimedCheckpoint: jest.fn(),
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
      completeClaimedCheckpoint: jest.fn(),
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
      completeClaimedCheckpoint: jest.fn(),
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
        completeClaimedCheckpoint: jest.fn(),
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

  it('delegates valid claimed-checkpoint completion', async () => {
    const completeClaimedCheckpoint = jest.fn(() => Promise.resolve(true));
    const service = new DueListingObservationCheckpointService({
      listDueCheckpoints: jest.fn(),
      claimDueCheckpoints: jest.fn(),
      completeClaimedCheckpoint,
    });
    const obs = sampleObservation();
    const input = {
      provider: 'binance' as const,
      symbol: 'NEWUSDT',
      label: 'T+5s' as const,
      claimToken: 'worker-1:batch-1',
      completedAt: new Date('2026-09-14T12:00:10.000Z'),
      observation: obs,
    };

    await expect(service.completeClaimed(input)).resolves.toBe(true);
    expect(completeClaimedCheckpoint).toHaveBeenCalledWith(input);
  });

  it.each([
    [{ provider: 'other' }, 'Checkpoint provider must be binance'],
    [{ symbol: 'new/usdt' }, 'Checkpoint symbol must be canonical'],
    [{ label: 'T+2s' }, 'Checkpoint label must be supported'],
    [{ claimToken: '' }, 'Checkpoint claim token must contain'],
    [
      { completedAt: new Date('invalid') },
      'Checkpoint completion time must be valid',
    ],
    [
      { observation: undefined },
      'Checkpoint observation identity must match checkpoint',
    ],
    [
      { observation: sampleObservation({ provider: 'other' as never }) },
      'Checkpoint observation identity must match checkpoint',
    ],
    [
      { observation: sampleObservation({ symbol: 'OTHERUSDT' }) },
      'Checkpoint observation identity must match checkpoint',
    ],
    [
      { observation: sampleObservation({ lastPrice: '0' }) },
      'Listing market observation last price must be positive',
    ],
  ])(
    'rejects invalid completion input before repository access %#',
    (change, message) => {
      const completeClaimedCheckpoint = jest.fn(() => Promise.resolve(true));
      const service = new DueListingObservationCheckpointService({
        listDueCheckpoints: jest.fn(),
        claimDueCheckpoints: jest.fn(),
        completeClaimedCheckpoint,
      });
      expect(() =>
        service.completeClaimed({
          provider: 'binance',
          symbol: 'NEWUSDT',
          label: 'T+5s',
          claimToken: 'worker-1',
          completedAt: new Date('2026-09-14T12:00:10.000Z'),
          observation: sampleObservation(),
          ...change,
        } as Parameters<typeof service.completeClaimed>[0]),
      ).toThrow(message);
      expect(completeClaimedCheckpoint).not.toHaveBeenCalled();
    },
  );

  it('delegates atomic completion with a matching top-of-book snapshot', async () => {
    const completeClaimedCheckpointWithTopOfBook = jest.fn(() =>
      Promise.resolve(true),
    );
    const service = new DueListingObservationCheckpointService({
      listDueCheckpoints: jest.fn(),
      claimDueCheckpoints: jest.fn(),
      completeClaimedCheckpoint: jest.fn(),
      completeClaimedCheckpointWithTopOfBook,
    });
    const input = {
      provider: 'binance' as const,
      symbol: 'NEWUSDT',
      label: 'T+5s' as const,
      claimToken: 'worker-1:batch-1',
      completedAt: new Date('2026-09-14T12:00:10.000Z'),
      observation: sampleObservation(),
      topOfBook: sampleTopOfBook(),
    };

    await expect(service.completeClaimedWithTopOfBook(input)).resolves.toBe(
      true,
    );
    expect(completeClaimedCheckpointWithTopOfBook).toHaveBeenCalledWith(input);
  });

  it('rejects a mismatched top-of-book before atomic completion', () => {
    const completeClaimedCheckpointWithTopOfBook = jest.fn();
    const service = new DueListingObservationCheckpointService({
      listDueCheckpoints: jest.fn(),
      claimDueCheckpoints: jest.fn(),
      completeClaimedCheckpoint: jest.fn(),
      completeClaimedCheckpointWithTopOfBook,
    });

    expect(() =>
      service.completeClaimedWithTopOfBook({
        provider: 'binance',
        symbol: 'NEWUSDT',
        label: 'T+0',
        claimToken: 'worker-1',
        completedAt: new Date('2026-09-14T12:00:10.000Z'),
        observation: sampleObservation(),
        topOfBook: sampleTopOfBook({ symbol: 'OTHERUSDT' }),
      }),
    ).toThrow('Checkpoint top-of-book identity must match checkpoint');
    expect(completeClaimedCheckpointWithTopOfBook).not.toHaveBeenCalled();
  });
});

function sampleObservation(
  overrides: Partial<
    import('../domain/listing-market-observation').ListingMarketObservation
  > = {},
): import('../domain/listing-market-observation').ListingMarketObservation {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    lastPrice: '0.00001000',
    baseVolume: '1200000.50000000',
    quoteVolume: '12.34567890',
    tradeCount: 42,
    windowOpenTime: new Date('2026-09-13T12:00:00.000Z'),
    windowCloseTime: new Date('2026-09-14T12:00:00.000Z'),
    receivedAt: new Date('2026-09-14T12:00:10.000Z'),
    ...overrides,
  };
}

function sampleTopOfBook(
  overrides: Partial<
    import('../domain/listing-top-of-book-observation').ListingTopOfBookObservation
  > = {},
): import('../domain/listing-top-of-book-observation').ListingTopOfBookObservation {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    updateId: '42',
    bidPrice: '0.00000999',
    bidQuantity: '1000',
    askPrice: '0.00001001',
    askQuantity: '900',
    receivedAt: new Date('2026-09-14T12:00:10.000Z'),
    ...overrides,
  };
}
