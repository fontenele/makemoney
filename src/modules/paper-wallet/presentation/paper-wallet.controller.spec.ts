import { ServiceUnavailableException } from '@nestjs/common';
import { jest } from '@jest/globals';
import { PaperWalletService } from '../application/paper-wallet.service';
import {
  MarketPriceUnavailableError,
  PortfolioValuationService,
  StaleMarketPriceError,
} from '../application/portfolio-valuation.service';
import { PortfolioValuation } from '../domain/portfolio-valuation';
import { PaperWalletController } from './paper-wallet.controller';

describe('PaperWalletController', () => {
  it('returns paper balances without exposing mutations', async () => {
    const getBalances = jest.fn<() => Promise<{ BTC: string; USDT: string }>>();
    getBalances.mockResolvedValue({ BTC: '0.1', USDT: '900' });
    const controller = createController({ getBalances });

    await expect(controller.getBalances()).resolves.toEqual({
      BTC: '0.1',
      USDT: '900',
    });
  });

  it('returns the current portfolio valuation', async () => {
    const value = valuation();
    const getValuation = jest.fn<() => Promise<PortfolioValuation>>();
    getValuation.mockResolvedValue(value);
    const controller = createController(undefined, { getValuation });

    await expect(controller.getValuation()).resolves.toBe(value);
  });

  it('maps only unavailable market price to service unavailable', async () => {
    const getValuation = jest.fn<() => Promise<PortfolioValuation>>();
    getValuation.mockRejectedValue(new MarketPriceUnavailableError());
    const controller = createController(undefined, { getValuation });

    await expect(controller.getValuation()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('does not hide unexpected valuation errors', async () => {
    const unexpected = new Error('unexpected');
    const getValuation = jest.fn<() => Promise<PortfolioValuation>>();
    getValuation.mockRejectedValue(unexpected);
    const controller = createController(undefined, { getValuation });

    await expect(controller.getValuation()).rejects.toThrow(unexpected);
  });

  it('maps a stale market price to service unavailable', async () => {
    const getValuation = jest.fn<() => Promise<PortfolioValuation>>();
    getValuation.mockRejectedValue(new StaleMarketPriceError(10001, 10000));
    const controller = createController(undefined, { getValuation });

    await expect(controller.getValuation()).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});

function createController(
  wallet: Partial<PaperWalletService> = {},
  valuationService: Partial<PortfolioValuationService> = {},
): PaperWalletController {
  return new PaperWalletController(
    wallet as PaperWalletService,
    valuationService as PortfolioValuationService,
  );
}

function valuation(): PortfolioValuation {
  return {
    quoteAsset: 'USDT',
    btcBalance: '0.1',
    btcPrice: '77000',
    btcValue: '7700',
    usdtBalance: '900',
    totalValue: '8600',
    pricedAt: new Date('2026-09-11T12:00:00.000Z'),
  };
}
