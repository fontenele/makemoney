import { ConfigService } from '@nestjs/config';
import { LatestTopOfBookService } from '../../market-data/application/latest-top-of-book.service';
import { Clock } from '../../paper-wallet/domain/clock';
import { PaperExecutionRepository } from '../domain/paper-execution-repository';
import { PaperExecution } from '../domain/trading-executor';
import {
  PaperPositionService,
  PositionMarketDataStaleError,
  PositionMarketDataUnavailableError,
} from './paper-position.service';

describe('PaperPositionService', () => {
  const now = new Date('2026-09-11T12:00:10.000Z');
  const config = {
    getOrThrow: (key: string) =>
      key === 'PAPER_TAKER_FEE_RATE' ? '0.001' : 10000,
  } as ConfigService;
  const clock: Clock = { now: () => now };

  it('returns an empty position without requiring top-of-book data', async () => {
    const service = createService([], undefined);

    await expect(service.getPosition()).resolves.toMatchObject({
      quantity: '0',
      markPrice: null,
      unrealizedPnl: '0',
      totalPnl: '0',
    });
  });

  it('values an open position from fresh best-bid data', async () => {
    const receivedAt = new Date('2026-09-11T12:00:00.000Z');
    const service = createService([buy], receivedAt);

    await expect(service.getPosition()).resolves.toMatchObject({
      quantity: '0.001',
      costBasis: '50.05',
      markPrice: '51000',
      grossMarketValue: '51',
      estimatedExitFee: '0.051',
      netLiquidationValue: '50.949',
      unrealizedPnl: '0.899',
      totalPnl: '0.899',
      marketDataReceivedAt: receivedAt,
    });
  });

  it('rejects an open position when top-of-book data is unavailable', async () => {
    await expect(createService([buy], undefined).getPosition()).rejects.toThrow(
      PositionMarketDataUnavailableError,
    );
  });

  it('rejects an open position when top-of-book data is stale', async () => {
    await expect(
      createService([buy], new Date('2026-09-11T11:59:59.999Z')).getPosition(),
    ).rejects.toThrow(PositionMarketDataStaleError);
  });

  function createService(
    executions: PaperExecution[],
    receivedAt: Date | undefined,
  ): PaperPositionService {
    const repository = {
      listAllChronological: () => Promise.resolve(executions),
    } as unknown as PaperExecutionRepository;
    const topOfBook = new LatestTopOfBookService();
    if (receivedAt) {
      topOfBook.update({
        provider: 'binance',
        symbol: 'BTC/USDT',
        updateId: '1',
        bidPrice: '51000',
        bidQuantity: '1',
        askPrice: '51001',
        askQuantity: '1',
        receivedAt,
      });
    }
    return new PaperPositionService(repository, topOfBook, config, clock);
  }
});

const buy = {
  id: 'buy-1',
  symbol: 'BTC/USDT' as const,
  side: 'buy' as const,
  quantity: '0.001',
  price: '50000',
  notional: '50',
  feeRate: '0.001',
  fee: '0.05',
  totalCost: '50.05',
  quotedAt: new Date(0),
  marketDataReceivedAt: new Date(0),
  executedAt: new Date(0),
  replayed: false,
};
