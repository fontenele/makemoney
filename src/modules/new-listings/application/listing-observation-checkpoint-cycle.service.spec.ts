import { jest } from '@jest/globals';
import { ClaimedListingObservationCheckpoint } from '../domain/listing-observation-schedule';
import { ListingMarketObservation } from '../domain/listing-market-observation';
import { ListingObservationCheckpointCycleService } from './listing-observation-checkpoint-cycle.service';

const claimedAt = new Date('2026-09-14T12:00:00.000Z');
const claimExpiresAt = new Date('2026-09-14T12:00:30.000Z');

describe('ListingObservationCheckpointCycleService', () => {
  const options = { intervalMs: 5000, batchSize: 25, leaseDurationMs: 30000 };

  it('claims one bounded batch and completes successful processing sequentially', async () => {
    const claimDue = jest.fn(() =>
      Promise.resolve([checkpoint('AUSDT'), checkpoint('BUSDT')]),
    );
    const completeClaimed = jest.fn(() => Promise.resolve(true));
    const process = jest.fn<
      (
        checkpoint: ClaimedListingObservationCheckpoint,
      ) => Promise<ListingMarketObservation>
    >((cp) => Promise.resolve(sampleObservation(cp.symbol)));
    const clock = jest.fn(() => claimedAt);
    const service = new ListingObservationCheckpointCycleService(
      { claimDue, completeClaimed } as never,
      options,
      clock,
      () => 'cycle-1',
    );

    await expect(service.runOnce({ process })).resolves.toEqual({
      claimed: 2,
      completed: 2,
      failed: 0,
      lostLease: 0,
    });
    expect(claimDue).toHaveBeenCalledWith({
      dueAt: claimedAt,
      limit: 25,
      claimToken: 'cycle-1',
      claimedAt,
      claimExpiresAt,
    });
    expect(process.mock.calls.map(([value]) => value.symbol)).toEqual([
      'AUSDT',
      'BUSDT',
    ]);
    expect(completeClaimed).toHaveBeenCalledTimes(2);
    expect(completeClaimed).toHaveBeenNthCalledWith(1, {
      provider: 'binance',
      symbol: 'AUSDT',
      label: 'T+0',
      claimToken: 'cycle-1',
      completedAt: claimedAt,
      observation: sampleObservation('AUSDT'),
    });
    expect(completeClaimed).toHaveBeenNthCalledWith(2, {
      provider: 'binance',
      symbol: 'BUSDT',
      label: 'T+0',
      claimToken: 'cycle-1',
      completedAt: claimedAt,
      observation: sampleObservation('BUSDT'),
    });
  });

  it('isolates processor failures and reports ownership lost before completion', async () => {
    const claimed = [
      checkpoint('AUSDT'),
      checkpoint('BUSDT'),
      checkpoint('CUSDT'),
    ];
    const completeClaimed = jest
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const process = jest.fn((value: ClaimedListingObservationCheckpoint) =>
      value.symbol === 'BUSDT'
        ? Promise.reject(new Error('processing failed'))
        : Promise.resolve(sampleObservation(value.symbol)),
    );
    const service = new ListingObservationCheckpointCycleService(
      {
        claimDue: jest.fn(() => Promise.resolve(claimed)),
        completeClaimed,
      } as never,
      options,
      () => claimedAt,
      () => 'cycle-2',
    );

    await expect(service.runOnce({ process })).resolves.toEqual({
      claimed: 3,
      completed: 1,
      failed: 1,
      lostLease: 1,
    });
    expect(completeClaimed).toHaveBeenCalledTimes(2);
    expect(completeClaimed).toHaveBeenNthCalledWith(1, {
      provider: 'binance',
      symbol: 'AUSDT',
      label: 'T+0',
      claimToken: 'cycle-1',
      completedAt: claimedAt,
      observation: sampleObservation('AUSDT'),
    });
    expect(completeClaimed).toHaveBeenNthCalledWith(2, {
      provider: 'binance',
      symbol: 'CUSDT',
      label: 'T+0',
      claimToken: 'cycle-1',
      completedAt: claimedAt,
      observation: sampleObservation('CUSDT'),
    });
  });

  it('returns an explicit empty result without invoking the processor', async () => {
    const process = jest.fn(() => Promise.resolve(sampleObservation('AUSDT')));
    const service = new ListingObservationCheckpointCycleService(
      {
        claimDue: jest.fn(() => Promise.resolve([])),
        completeClaimed: jest.fn(),
      } as never,
      options,
      () => claimedAt,
      () => 'cycle-3',
    );

    await expect(service.runOnce({ process })).resolves.toEqual({
      claimed: 0,
      completed: 0,
      failed: 0,
      lostLease: 0,
    });
    expect(process).not.toHaveBeenCalled();
  });
});

function checkpoint(symbol: string): ClaimedListingObservationCheckpoint {
  return {
    provider: 'binance',
    symbol,
    label: 'T+0',
    offsetMs: 0,
    targetAt: claimedAt,
    claimToken: 'cycle-1',
    claimedAt,
    claimExpiresAt,
  };
}

function sampleObservation(symbol: string): ListingMarketObservation {
  return {
    provider: 'binance',
    symbol,
    lastPrice: '1.23000000',
    baseVolume: '1000.50000000',
    quoteVolume: '1230.61500000',
    tradeCount: 42,
    windowOpenTime: new Date('2026-09-13T12:00:00.000Z'),
    windowCloseTime: new Date('2026-09-14T12:00:00.000Z'),
    receivedAt: claimedAt,
  };
}
