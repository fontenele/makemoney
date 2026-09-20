import { jest } from '@jest/globals';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaSpotSymbolRepository } from './prisma-spot-symbol.repository';

describe('PrismaSpotSymbolRepository atomic top-of-book completion', () => {
  it('completes the checkpoint and creates its book in one transaction', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const create = jest.fn().mockResolvedValue({});
    const transaction = jest.fn((operation: (tx: unknown) => unknown) =>
      Promise.resolve(
        operation({
          listingObservationCheckpoint: { updateMany },
          listingCheckpointTopOfBook: { create },
        }),
      ),
    );
    const repository = new PrismaSpotSymbolRepository({
      $transaction: transaction,
    } as unknown as PrismaService);
    const input = completionInput();

    await expect(
      repository.completeClaimedCheckpointWithTopOfBook(input),
    ).resolves.toBe(true);
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: {
        provider: 'binance',
        symbol: 'NEWUSDT',
        label: 'T+0',
        updateId: '42',
        bidPrice: '9.9',
        bidQuantity: '10',
        askPrice: '10.1',
        askQuantity: '9',
        receivedAt: input.topOfBook.receivedAt,
      },
    });
  });

  it('does not create a book after lease ownership is lost', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 0 });
    const create = jest.fn();
    const transaction = jest.fn((operation: (tx: unknown) => unknown) =>
      Promise.resolve(
        operation({
          listingObservationCheckpoint: { updateMany },
          listingCheckpointTopOfBook: { create },
        }),
      ),
    );
    const repository = new PrismaSpotSymbolRepository({
      $transaction: transaction,
    } as unknown as PrismaService);

    await expect(
      repository.completeClaimedCheckpointWithTopOfBook(completionInput()),
    ).resolves.toBe(false);
    expect(create).not.toHaveBeenCalled();
  });
});

function completionInput() {
  return {
    provider: 'binance' as const,
    symbol: 'NEWUSDT',
    label: 'T+0' as const,
    claimToken: 'worker-1',
    completedAt: new Date('2026-09-20T12:00:01.000Z'),
    observation: {
      provider: 'binance' as const,
      symbol: 'NEWUSDT',
      lastPrice: '10',
      baseVolume: '100',
      quoteVolume: '1000',
      tradeCount: 20,
      windowOpenTime: new Date('2026-09-19T12:00:00.000Z'),
      windowCloseTime: new Date('2026-09-20T12:00:00.000Z'),
      receivedAt: new Date('2026-09-20T12:00:00.500Z'),
    },
    topOfBook: {
      provider: 'binance' as const,
      symbol: 'NEWUSDT',
      updateId: '42',
      bidPrice: '9.9',
      bidQuantity: '10',
      askPrice: '10.1',
      askQuantity: '9',
      receivedAt: new Date('2026-09-20T12:00:00.750Z'),
    },
  };
}
