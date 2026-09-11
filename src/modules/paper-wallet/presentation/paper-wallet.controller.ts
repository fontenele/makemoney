import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { PaperWalletService } from '../application/paper-wallet.service';
import {
  MarketPriceUnavailableError,
  PortfolioValuationService,
} from '../application/portfolio-valuation.service';
import { PaperWalletBalances } from '../domain/paper-wallet';
import { PortfolioValuation } from '../domain/portfolio-valuation';

@Controller('paper-wallet')
export class PaperWalletController {
  constructor(
    private readonly wallet: PaperWalletService,
    private readonly valuation: PortfolioValuationService,
  ) {}

  @Get('balances')
  getBalances(): PaperWalletBalances {
    return this.wallet.getBalances();
  }

  @Get('valuation')
  getValuation(): PortfolioValuation {
    try {
      return this.valuation.getValuation();
    } catch (error: unknown) {
      if (error instanceof MarketPriceUnavailableError) {
        throw new ServiceUnavailableException(error.message);
      }

      throw error;
    }
  }
}
