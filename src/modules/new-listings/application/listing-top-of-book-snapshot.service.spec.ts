import { jest } from '@jest/globals';
import {
  ListingTopOfBookObservation,
  ListingTopOfBookObservationProvider,
} from '../domain/listing-top-of-book-observation';
import { ListingTopOfBookSpread } from '../domain/listing-top-of-book-spread';
import { ListingTopOfBookSnapshotService } from './listing-top-of-book-snapshot.service';
import { ListingTopOfBookSpreadCalculator } from './listing-top-of-book-spread-calculator';

describe('ListingTopOfBookSnapshotService', () => {
  it('loads one explicit snapshot and calculates its exact spread', async () => {
    const observation = topOfBook();
    const spread = topOfBookSpread();
    const load = jest.fn().mockResolvedValue(observation);
    const provider: ListingTopOfBookObservationProvider = {
      load,
    };
    const calculate = jest.fn().mockReturnValue(spread);
    const calculator = {
      calculate,
    } as unknown as ListingTopOfBookSpreadCalculator;
    const service = new ListingTopOfBookSnapshotService(provider, calculator);
    const signal = new AbortController().signal;

    await expect(
      service.load({ provider: 'binance', symbol: 'NEWUSDT' }, signal),
    ).resolves.toBe(spread);
    expect(load).toHaveBeenCalledWith(
      { provider: 'binance', symbol: 'NEWUSDT' },
      signal,
    );
    expect(calculate).toHaveBeenCalledWith(observation);
  });

  it('propagates provider failure without calculating a spread', async () => {
    const failure = new Error('provider unavailable');
    const load = jest.fn().mockRejectedValue(failure);
    const provider: ListingTopOfBookObservationProvider = {
      load,
    };
    const calculate = jest.fn();
    const calculator = {
      calculate,
    } as unknown as ListingTopOfBookSpreadCalculator;
    const service = new ListingTopOfBookSnapshotService(provider, calculator);

    await expect(
      service.load({ provider: 'binance', symbol: 'NEWUSDT' }),
    ).rejects.toBe(failure);
    expect(calculate).not.toHaveBeenCalled();
  });
});

function topOfBook(): ListingTopOfBookObservation {
  return {
    provider: 'binance',
    symbol: 'NEWUSDT',
    updateId: '42',
    bidPrice: '1.2',
    bidQuantity: '10',
    askPrice: '1.3',
    askQuantity: '9',
    receivedAt: new Date('2026-09-20T12:00:00.000Z'),
  };
}

function topOfBookSpread(): ListingTopOfBookSpread {
  return {
    ...topOfBook(),
    absoluteSpread: '0.1',
    midPrice: '1.25',
    spreadBasisPoints: '800',
  };
}
