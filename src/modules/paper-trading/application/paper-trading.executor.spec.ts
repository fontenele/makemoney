import { jest } from '@jest/globals';
import { PaperWalletService } from '../../paper-wallet/application/paper-wallet.service';
import { Clock } from '../../paper-wallet/domain/clock';
import { RiskEngine } from '../../risk-engine/domain/risk-engine';
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
      approvingRiskEngine(),
      wallet(),
      clock(),
    );

    await expect(executor.execute(intent())).resolves.toBe(execution);
    expect(repository.executeBuy).toHaveBeenCalledWith(
      'order-1',
      quote,
      new Date('2026-09-12T12:00:00.000Z'),
    );
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
      approvingRiskEngine(),
      wallet(),
      clock(),
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
      approvingRiskEngine(),
      wallet(),
      clock(),
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
      approvingRiskEngine(),
      wallet(),
      clock(),
    );
    await expect(
      executor.execute({ ...intent(), idempotencyKey: '' }),
    ).rejects.toThrow('Invalid paper execution idempotency key');
    expect(repository.find).not.toHaveBeenCalled();
  });

  it('rejects a quoted order before balance mutation when risk rejects it', async () => {
    const quote = {
      quantity: '0.0021',
      notional: '105',
      totalCost: '105.105',
    } as never;
    const repository = repo();
    const riskEngine: RiskEngine = {
      assess: jest.fn(() => ({
        decision: 'rejected',
        rule: 'max_order_notional_usdt',
        reason: 'max_order_notional_exceeded',
        notional: '105',
        limit: '100',
      })),
    };
    const executor = new PaperTradingExecutor(
      { quote: jest.fn(() => quote) } as unknown as PaperMarketBuyQuoteService,
      {} as PaperMarketSellQuoteService,
      repository,
      riskEngine,
      wallet(),
      clock(),
    );

    await expect(executor.execute(intent())).rejects.toThrow(
      'Paper order rejected by risk',
    );
    expect(repository.executeBuy).not.toHaveBeenCalled();
    expect(repository.executeSell).not.toHaveBeenCalled();
  });
});

function approvingRiskEngine(): RiskEngine {
  return {
    assess: jest.fn(() => ({
      decision: 'approved',
      rule: 'max_order_notional_usdt',
      notional: '77.77712',
      limit: '100',
    })),
  };
}

function wallet(balance = '0'): PaperWalletService {
  return {
    getBalance: jest.fn(() => Promise.resolve(balance)),
  } as unknown as PaperWalletService;
}

function clock(): Clock {
  return { now: () => new Date('2026-09-12T12:00:00.000Z') };
}

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
    quotedAt: new Date('2026-09-11T12:00:05.000Z'),
    marketDataReceivedAt: new Date('2026-09-11T12:00:00.000Z'),
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
    quotedAt: new Date('2026-09-11T12:00:05.000Z'),
    marketDataReceivedAt: new Date('2026-09-11T12:00:00.000Z'),
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
    listRecent: jest.fn<PaperExecutionRepository['listRecent']>(),
    listAllChronological: jest.fn<
      PaperExecutionRepository['listAllChronological']
    >(() => Promise.resolve([])),
    executeBuy: jest.fn<PaperExecutionRepository['executeBuy']>(),
    executeSell: jest.fn<PaperExecutionRepository['executeSell']>(),
  };
}
