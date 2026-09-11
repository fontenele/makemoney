import { PaperWallet } from '../domain/paper-wallet';
import { PaperWalletService } from './paper-wallet.service';

describe('PaperWalletService', () => {
  it('exposes the wallet balances', () => {
    const service = new PaperWalletService(
      new PaperWallet({ BTC: '0', USDT: '1000' }),
    );

    expect(service.getBalances()).toEqual({ BTC: '0', USDT: '1000' });
  });

  it('delegates balance changes to the domain wallet', () => {
    const service = new PaperWalletService(
      new PaperWallet({ BTC: '0', USDT: '1000' }),
    );

    expect(service.debit('USDT', '100')).toBe('900');
    expect(service.credit('BTC', '0.001')).toBe('0.001');
  });
});
