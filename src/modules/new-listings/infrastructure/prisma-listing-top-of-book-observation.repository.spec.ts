import { jest } from '@jest/globals';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { ListingTopOfBookObservation } from '../domain/listing-top-of-book-observation';
import { PrismaListingTopOfBookObservationRepository } from './prisma-listing-top-of-book-observation.repository';

describe('PrismaListingTopOfBookObservationRepository', () => {
  it('stores one immutable observation under its checkpoint identity', async () => {
    const observation = topOfBook();
    const create = jest.fn().mockResolvedValue({
      provider: 'binance',
      symbol: 'NEWUSDT',
      label: 'T+5s',
      updateId: '42',
      bidPrice: '1.2',
      bidQuantity: '10',
      askPrice: '1.3',
      askQuantity: '9',
      receivedAt: observation.receivedAt,
      createdAt: new Date('2026-09-20T12:00:01.000Z'),
    });
    const prisma = {
      listingCheckpointTopOfBook: { create },
    } as unknown as PrismaService;
    const repository = new PrismaListingTopOfBookObservationRepository(prisma);

    await expect(
      repository.store({
        provider: 'binance',
        symbol: 'NEWUSDT',
        label: 'T+5s',
        observation,
      }),
    ).resolves.toEqual(observation);
    expect(create).toHaveBeenCalledWith({
      data: {
        provider: 'binance',
        symbol: 'NEWUSDT',
        label: 'T+5s',
        updateId: '42',
        bidPrice: '1.2',
        bidQuantity: '10',
        askPrice: '1.3',
        askQuantity: '9',
        receivedAt: observation.receivedAt,
      },
    });
  });

  it('rejects mismatched checkpoint identity before persistence', async () => {
    const create = jest.fn();
    const prisma = {
      listingCheckpointTopOfBook: { create },
    } as unknown as PrismaService;
    const repository = new PrismaListingTopOfBookObservationRepository(prisma);

    await expect(
      repository.store({
        provider: 'binance',
        symbol: 'OTHERUSDT',
        label: 'T+0',
        observation: topOfBook(),
      }),
    ).rejects.toThrow('Listing top-of-book checkpoint identity mismatch');
    expect(create).not.toHaveBeenCalled();
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
