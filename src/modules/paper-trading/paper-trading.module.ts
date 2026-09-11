import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { PaperWalletModule } from '../paper-wallet/paper-wallet.module';
import { PaperMarketBuyQuoteService } from './application/paper-market-buy-quote.service';
import { PaperMarketSellQuoteService } from './application/paper-market-sell-quote.service';
import { PaperTradingExecutor } from './application/paper-trading.executor';
import { PAPER_EXECUTION_REPOSITORY } from './domain/paper-execution-repository';
import { PrismaPaperExecutionRepository } from './infrastructure/prisma-paper-execution.repository';

@Module({
  imports: [MarketDataModule, PaperWalletModule],
  providers: [
    PaperMarketBuyQuoteService,
    PaperMarketSellQuoteService,
    {
      provide: PAPER_EXECUTION_REPOSITORY,
      useClass: PrismaPaperExecutionRepository,
    },
    PaperTradingExecutor,
  ],
  exports: [
    PaperMarketBuyQuoteService,
    PaperMarketSellQuoteService,
    PaperTradingExecutor,
  ],
})
export class PaperTradingModule {}
