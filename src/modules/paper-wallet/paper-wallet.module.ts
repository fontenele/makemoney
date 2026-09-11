import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MarketDataModule } from '../market-data/market-data.module';
import { PaperWalletService } from './application/paper-wallet.service';
import { PortfolioValuationService } from './application/portfolio-valuation.service';
import { PaperWallet } from './domain/paper-wallet';
import { PaperWalletController } from './presentation/paper-wallet.controller';

@Module({
  imports: [MarketDataModule],
  controllers: [PaperWalletController],
  providers: [
    {
      provide: PaperWallet,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PaperWallet =>
        new PaperWallet({
          BTC: '0',
          USDT: config.getOrThrow<string>('PAPER_INITIAL_USDT_BALANCE'),
        }),
    },
    PaperWalletService,
    PortfolioValuationService,
  ],
  exports: [PaperWalletService, PortfolioValuationService],
})
export class PaperWalletModule {}
