import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { PaperWalletService } from './application/paper-wallet.service';
import { PortfolioValuationService } from './application/portfolio-valuation.service';
import { PAPER_BALANCE_REPOSITORY } from './domain/paper-balance-repository';
import { CLOCK } from './domain/clock';
import { SystemClock } from './infrastructure/system-clock';
import { PrismaPaperBalanceRepository } from './infrastructure/prisma-paper-balance.repository';
import { PaperWalletController } from './presentation/paper-wallet.controller';

@Module({
  imports: [MarketDataModule],
  controllers: [PaperWalletController],
  providers: [
    {
      provide: PAPER_BALANCE_REPOSITORY,
      useClass: PrismaPaperBalanceRepository,
    },
    PaperWalletService,
    {
      provide: CLOCK,
      useClass: SystemClock,
    },
    PortfolioValuationService,
  ],
  exports: [PaperWalletService, PortfolioValuationService],
})
export class PaperWalletModule {}
