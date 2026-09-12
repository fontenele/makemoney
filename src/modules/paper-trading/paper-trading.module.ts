import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { PaperWalletModule } from '../paper-wallet/paper-wallet.module';
import { PaperMarketBuyQuoteService } from './application/paper-market-buy-quote.service';
import { PaperExecutionHistoryService } from './application/paper-execution-history.service';
import { PaperPositionService } from './application/paper-position.service';
import { PaperMarketSellQuoteService } from './application/paper-market-sell-quote.service';
import { PaperTradingExecutor } from './application/paper-trading.executor';
import { PaperTradingPerformanceService } from './application/paper-trading-performance.service';
import { PAPER_EXECUTION_REPOSITORY } from './domain/paper-execution-repository';
import { PrismaPaperExecutionRepository } from './infrastructure/prisma-paper-execution.repository';
import { PaperTradingController } from './presentation/paper-trading.controller';

@Module({
  imports: [MarketDataModule, PaperWalletModule],
  controllers: [PaperTradingController],
  providers: [
    PaperExecutionHistoryService,
    PaperPositionService,
    PaperTradingPerformanceService,
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
