import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PaperWalletService } from '../application/paper-wallet.service';
import {
  MarketPriceUnavailableError,
  PortfolioValuationService,
  StaleMarketPriceError,
} from '../application/portfolio-valuation.service';
import { PaperWalletBalances } from '../domain/paper-wallet';
import { PortfolioValuation } from '../domain/portfolio-valuation';

@Controller('paper-wallet')
export class PaperWalletController {
  private readonly logger = new Logger(PaperWalletController.name);

  constructor(
    private readonly wallet: PaperWalletService,
    private readonly valuation: PortfolioValuationService,
  ) {}

  @Get('balances')
  getBalances(): Promise<PaperWalletBalances> {
    return this.wallet.getBalances();
  }

  @Get('valuation')
  async getValuation(): Promise<PortfolioValuation> {
    try {
      return await this.valuation.getValuation();
    } catch (error: unknown) {
      if (
        error instanceof MarketPriceUnavailableError ||
        error instanceof StaleMarketPriceError
      ) {
        this.logger.warn({
          event: 'paper_wallet.valuation_unavailable',
          reason:
            error instanceof StaleMarketPriceError
              ? 'stale_market_price'
              : 'missing_market_price',
          ...(error instanceof StaleMarketPriceError
            ? {
                priceAgeMs: error.priceAgeMs,
                maxPriceAgeMs: error.maxPriceAgeMs,
              }
            : {}),
        });
        throw new ServiceUnavailableException(error.message);
      }

      throw error;
    }
  }
}
