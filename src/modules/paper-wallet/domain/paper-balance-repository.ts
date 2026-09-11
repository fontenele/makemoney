import { Asset } from './asset';
import { PaperWalletBalances } from './paper-wallet';

export const PAPER_BALANCE_REPOSITORY = Symbol('PAPER_BALANCE_REPOSITORY');

export interface PaperBalanceRepository {
  initialize(defaults: PaperWalletBalances): Promise<void>;
  getBalance(asset: Asset): Promise<string>;
  getBalances(): Promise<PaperWalletBalances>;
  credit(asset: Asset, amount: string): Promise<string>;
  debit(asset: Asset, amount: string): Promise<string>;
}
