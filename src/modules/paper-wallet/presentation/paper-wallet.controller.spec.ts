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
  it('returns paper balances without exposing mutations', () => {
    const getBalances = jest.fn<() => { BTC: string; USDT: string }>();
    getBalances.mockReturnValue({ BTC: '0.1', USDT: '900' });
    const controller = createController({ getBalances });

    expect(controller.getBalances()).toEqual({ BTC: '0.1', USDT: '900' });
  });

  it('returns the current portfolio valuation', () => {
    const value = valuation();
    const getValuation = jest.fn<() => PortfolioValuation>();
    getValuation.mockReturnValue(value);
    const controller = createController(undefined, { getValuation });

    expect(controller.getValuation()).toBe(value);
  });

  it('maps only unavailable market price to service unavailable', () => {
    const getValuation = jest.fn<() => PortfolioValuation>();
    getValuation.mockImplementation(() => {
      throw new MarketPriceUnavailableError();
    });
    const controller = createController(undefined, { getValuation });

    expect(() => controller.getValuation()).toThrow(
      ServiceUnavailableException,
    );
  });

  it('does not hide unexpected valuation errors', () => {
    const unexpected = new Error('unexpected');
    const getValuation = jest.fn<() => PortfolioValuation>();
    getValuation.mockImplementation(() => {
      throw unexpected;
    });
    const controller = createController(undefined, { getValuation });

    expect(() => controller.getValuation()).toThrow(unexpected);
  });

  it('maps a stale market price to service unavailable', () => {
    const getValuation = jest.fn<() => PortfolioValuation>();
    getValuation.mockImplementation(() => {
      throw new StaleMarketPriceError(10001, 10000);
    });
    const controller = createController(undefined, { getValuation });

    expect(() => controller.getValuation()).toThrow(
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
