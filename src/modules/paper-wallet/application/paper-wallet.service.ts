import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Asset } from '../domain/asset';
import {
  PAPER_BALANCE_REPOSITORY,
  PaperBalanceRepository,
} from '../domain/paper-balance-repository';
import {
  normalizePositiveAmount,
  PaperWalletBalances,
} from '../domain/paper-wallet';

@Injectable()
export class PaperWalletService implements OnModuleInit {
  private readonly logger = new Logger(PaperWalletService.name);

  constructor(
    @Inject(PAPER_BALANCE_REPOSITORY)
    private readonly repository: PaperBalanceRepository,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.repository.initialize({
      BTC: '0',
      USDT: this.config.getOrThrow<string>('PAPER_INITIAL_USDT_BALANCE'),
    });
    this.logger.log({
      event: 'paper_wallet.initialized',
      balances: await this.repository.getBalances(),
      persistence: 'postgresql',
    });
  }

  getBalance(asset: Asset): Promise<string> {
    return this.repository.getBalance(asset);
  }

  getBalances(): Promise<PaperWalletBalances> {
    return this.repository.getBalances();
  }

  async credit(asset: Asset, amount: string): Promise<string> {
    const normalizedAmount = normalizePositiveAmount(amount);
    const balance = await this.repository.credit(asset, normalizedAmount);
    this.logBalanceChange('credit', asset, normalizedAmount, balance);
    return balance;
  }

  async debit(asset: Asset, amount: string): Promise<string> {
    const normalizedAmount = normalizePositiveAmount(amount);
    const balance = await this.repository.debit(asset, normalizedAmount);
    this.logBalanceChange('debit', asset, normalizedAmount, balance);
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
