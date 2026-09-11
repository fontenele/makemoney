import { Module } from '@nestjs/common';
import { MarketDataModule } from '../market-data/market-data.module';
import { PaperWalletModule } from '../paper-wallet/paper-wallet.module';
import { PaperMarketBuyQuoteService } from './application/paper-market-buy-quote.service';

@Module({
  imports: [MarketDataModule, PaperWalletModule],
  providers: [PaperMarketBuyQuoteService],
  exports: [PaperMarketBuyQuoteService],
})
export class PaperTradingModule {}
