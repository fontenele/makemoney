import Decimal from 'decimal.js';
import { Asset, PAPER_WALLET_ASSETS } from './asset';

const WalletDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

const DECIMAL_PATTERN = /^(0|[1-9]\d{0,19})(\.\d{1,18})?$/;

export type PaperWalletBalances = Record<Asset, string>;

export class PaperWallet {
  private readonly balances = new Map<Asset, Decimal>();

  constructor(initialBalances: PaperWalletBalances) {
    for (const asset of PAPER_WALLET_ASSETS) {
      const balance = parseDecimal(initialBalances[asset], 'initial balance');

      this.balances.set(asset, balance);
    }
  }

  getBalance(asset: Asset): string {
    return this.getDecimalBalance(asset).toFixed();
  }

  getBalances(): PaperWalletBalances {
    return {
      BTC: this.getBalance('BTC'),
      USDT: this.getBalance('USDT'),
    };
  }

  credit(asset: Asset, amount: string): string {
    const creditAmount = new WalletDecimal(normalizePositiveAmount(amount));
    const updatedBalance = this.getDecimalBalance(asset).plus(creditAmount);

    this.balances.set(asset, updatedBalance);
    return updatedBalance.toFixed();
  }

  debit(asset: Asset, amount: string): string {
    const debitAmount = new WalletDecimal(normalizePositiveAmount(amount));
    const currentBalance = this.getDecimalBalance(asset);

    if (debitAmount.greaterThan(currentBalance)) {
      throw new RangeError(`Insufficient ${asset} paper balance`);
    }

    const updatedBalance = currentBalance.minus(debitAmount);
    this.balances.set(asset, updatedBalance);
    return updatedBalance.toFixed();
  }

  private getDecimalBalance(asset: Asset): Decimal {
    const balance = this.balances.get(asset);

    if (!balance) {
      throw new Error(`Missing ${asset} paper balance`);
    }

    return balance;
  }
}

export function normalizePositiveAmount(value: string): string {
  const amount = parseDecimal(value, 'amount');

  if (amount.lessThanOrEqualTo(0)) {
    throw new RangeError('Paper wallet amount must be greater than zero');
  }

  return amount.toFixed();
}

function parseDecimal(value: string, label: string): Decimal {
  if (!DECIMAL_PATTERN.test(value)) {
    throw new TypeError(`Invalid paper wallet ${label}`);
  }

  return new WalletDecimal(value);
}
