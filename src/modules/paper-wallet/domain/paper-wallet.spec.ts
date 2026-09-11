import { PaperWallet } from './paper-wallet';

describe('PaperWallet', () => {
  it('exposes its initial BTC and USDT balances', () => {
    const wallet = new PaperWallet({ BTC: '0', USDT: '1000' });

    expect(wallet.getBalances()).toEqual({ BTC: '0', USDT: '1000' });
  });

  it('credits a balance with exact decimal arithmetic', () => {
    const wallet = new PaperWallet({ BTC: '0.1', USDT: '1000' });

    expect(wallet.credit('BTC', '0.2')).toBe('0.3');
    expect(wallet.getBalance('BTC')).toBe('0.3');
  });

  it('debits a balance with exact decimal arithmetic', () => {
    const wallet = new PaperWallet({ BTC: '1', USDT: '1000' });

    expect(wallet.debit('USDT', '999.99')).toBe('0.01');
    expect(wallet.getBalance('USDT')).toBe('0.01');
  });

  it('allows an exact full-balance debit', () => {
    const wallet = new PaperWallet({ BTC: '0', USDT: '1000' });

    expect(wallet.debit('USDT', '1000')).toBe('0');
  });

  it('rejects a debit that exceeds the available balance', () => {
    const wallet = new PaperWallet({ BTC: '0', USDT: '10' });

    expect(() => wallet.debit('USDT', '10.01')).toThrow(
      'Insufficient USDT paper balance',
    );
    expect(wallet.getBalance('USDT')).toBe('10');
  });

  it.each(['0', '-1', 'NaN', '1e3'])('rejects invalid amount %s', (amount) => {
    const wallet = new PaperWallet({ BTC: '0', USDT: '1000' });

    expect(() => wallet.credit('USDT', amount)).toThrow();
    expect(() => wallet.debit('USDT', amount)).toThrow();
  });

  it('rejects an invalid initial balance', () => {
    expect(() => new PaperWallet({ BTC: '0', USDT: '-1' })).toThrow(
      'Invalid paper wallet initial balance',
    );
  });
});
