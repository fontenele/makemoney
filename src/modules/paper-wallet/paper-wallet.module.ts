import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PaperWalletService } from './application/paper-wallet.service';
import { PaperWallet } from './domain/paper-wallet';

@Module({
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
  ],
  exports: [PaperWalletService],
})
export class PaperWalletModule {}
