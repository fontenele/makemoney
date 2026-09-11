import { jest } from '@jest/globals';
import { PaperExecutionRepository } from '../domain/paper-execution-repository';
import { PaperExecution } from '../domain/trading-executor';
import { PaperMarketBuyQuoteService } from './paper-market-buy-quote.service';
import { PaperMarketSellQuoteService } from './paper-market-sell-quote.service';
import { PaperTradingExecutor } from './paper-trading.executor';

describe('PaperTradingExecutor', () => {
  it('quotes and atomically delegates a new paper buy', async () => {
    const quote = { quantity: '0.001', totalCost: '77.85489712' } as never;
    const execution = result(false);
    const quoteService = {
      quote: jest.fn(() => quote),
    } as unknown as PaperMarketBuyQuoteService;
    const repository = repo();
    repository.executeBuy.mockResolvedValue(execution);
    const executor = new PaperTradingExecutor(
      quoteService,
      {} as PaperMarketSellQuoteService,
      repository,
    );

    await expect(executor.execute(intent())).resolves.toBe(execution);
    expect(repository.executeBuy).toHaveBeenCalledWith('order-1', quote);
  });

  it('replays an existing execution without quoting or mutating', async () => {
    const quote = jest.fn();
    const quoteService = {
      quote,
    } as unknown as PaperMarketBuyQuoteService;
    const repository = repo();
    repository.find.mockResolvedValue(result(false));
    const executor = new PaperTradingExecutor(
      quoteService,
      {} as PaperMarketSellQuoteService,
      repository,
    );

    await expect(executor.execute(intent())).resolves.toMatchObject({
      replayed: true,
    });
    expect(quote).not.toHaveBeenCalled();
    expect(repository.executeBuy).not.toHaveBeenCalled();
  });

  it('quotes and atomically delegates a new paper sell', async () => {
    const quote = { quantity: '0.001', netProceeds: '77.69933289' } as never;
    const execution = sellResult(false);
    const quoteService = {
      quote: jest.fn(() => quote),
    } as unknown as PaperMarketSellQuoteService;
    const repository = repo();
    repository.executeSell.mockResolvedValue(execution);
    const executor = new PaperTradingExecutor(
      {} as PaperMarketBuyQuoteService,
      quoteService,
      repository,
    );

    await expect(executor.execute(sellIntent())).resolves.toBe(execution);
    expect(repository.executeSell).toHaveBeenCalledWith('sell-order-1', quote);
  });

  it('rejects an invalid idempotency key before repository access', async () => {
    const repository = repo();
    const executor = new PaperTradingExecutor(
      {} as PaperMarketBuyQuoteService,
      {} as PaperMarketSellQuoteService,
      repository,
    );
    await expect(
      executor.execute({ ...intent(), idempotencyKey: '' }),
    ).rejects.toThrow('Invalid paper execution idempotency key');
    expect(repository.find).not.toHaveBeenCalled();
  });
});

function intent() {
  return {
    idempotencyKey: 'order-1',
    symbol: 'BTC/USDT' as const,
    side: 'buy' as const,
    quantity: '0.001',
  };
}

function sellIntent() {
  return {
    idempotencyKey: 'sell-order-1',
    symbol: 'BTC/USDT' as const,
    side: 'sell' as const,
    quantity: '0.001',
  };
}

function result(replayed: boolean): PaperExecution {
  return {
    id: 'order-1',
    symbol: 'BTC/USDT',
    side: 'buy',
    quantity: '0.001',
    price: '77777.12',
    notional: '77.77712',
    feeRate: '0.001',
    fee: '0.07777712',
    totalCost: '77.85489712',
    executedAt: new Date(),
    replayed,
  };
}

function sellResult(replayed: boolean): PaperExecution {
  return {
    id: 'sell-order-1',
    symbol: 'BTC/USDT',
    side: 'sell',
    quantity: '0.001',
    price: '77777.11',
    notional: '77.77711',
    feeRate: '0.001',
    fee: '0.07777711',
    netProceeds: '77.69933289',
    executedAt: new Date(),
    replayed,
  };
}

type MockRepo = {
  [K in keyof PaperExecutionRepository]: jest.MockedFunction<
    PaperExecutionRepository[K]
  >;
};
function repo(): MockRepo {
  return {
    find: jest.fn<PaperExecutionRepository['find']>(),
    executeBuy: jest.fn<PaperExecutionRepository['executeBuy']>(),
    executeSell: jest.fn<PaperExecutionRepository['executeSell']>(),
  };
}
