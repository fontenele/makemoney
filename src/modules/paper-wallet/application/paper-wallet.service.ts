import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Asset } from '../domain/asset';
import { PaperWallet, PaperWalletBalances } from '../domain/paper-wallet';

@Injectable()
export class PaperWalletService implements OnModuleInit {
  private readonly logger = new Logger(PaperWalletService.name);

  constructor(private readonly wallet: PaperWallet) {}

  onModuleInit(): void {
    this.logger.log({
      event: 'paper_wallet.initialized',
      balances: this.wallet.getBalances(),
    });
  }

  getBalance(asset: Asset): string {
    return this.wallet.getBalance(asset);
  }

  getBalances(): PaperWalletBalances {
    return this.wallet.getBalances();
  }

  credit(asset: Asset, amount: string): string {
    const balance = this.wallet.credit(asset, amount);
    this.logBalanceChange('credit', asset, amount, balance);
    return balance;
  }

  debit(asset: Asset, amount: string): string {
    const balance = this.wallet.debit(asset, amount);
    this.logBalanceChange('debit', asset, amount, balance);
    return balance;
  }

  private logBalanceChange(
    operation: 'credit' | 'debit',
    asset: Asset,
    amount: string,
    balance: string,
  ): void {
    this.logger.log({
      event: 'paper_wallet.balance_changed',
      operation,
      asset,
      amount,
      balance,
    });
  }
}
