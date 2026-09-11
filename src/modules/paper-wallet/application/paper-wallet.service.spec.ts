import { ConfigService } from '@nestjs/config';
import { jest } from '@jest/globals';
import { PaperBalanceRepository } from '../domain/paper-balance-repository';
import { PaperWalletService } from './paper-wallet.service';

describe('PaperWalletService', () => {
  it('initializes missing balances and preserves repository state', async () => {
    const repository = createRepository();
    repository.getBalances.mockResolvedValue({ BTC: '0.5', USDT: '900' });
    const service = createService(repository);

    await service.onModuleInit();

    expect(repository.initialize).toHaveBeenCalledWith({
      BTC: '0',
      USDT: '1000',
    });
    await expect(service.getBalances()).resolves.toEqual({
      BTC: '0.5',
      USDT: '900',
    });
  });

  it('normalizes and delegates balance changes', async () => {
    const repository = createRepository();
    repository.debit.mockResolvedValue('900');
    repository.credit.mockResolvedValue('0.001');
    const service = createService(repository);

    await expect(service.debit('USDT', '100.00')).resolves.toBe('900');
    await expect(service.credit('BTC', '0.0010')).resolves.toBe('0.001');
    expect(repository.debit).toHaveBeenCalledWith('USDT', '100');
    expect(repository.credit).toHaveBeenCalledWith('BTC', '0.001');
  });

  it('rejects invalid amounts before persistence', async () => {
    const repository = createRepository();
    const service = createService(repository);

    await expect(service.credit('BTC', '0')).rejects.toThrow();
    expect(repository.credit).not.toHaveBeenCalled();
  });
});

function createService(repository: MockRepository): PaperWalletService {
  return new PaperWalletService(
    repository,
    new ConfigService({ PAPER_INITIAL_USDT_BALANCE: '1000' }),
  );
}

type MockRepository = {
  [Key in keyof PaperBalanceRepository]: jest.MockedFunction<
    PaperBalanceRepository[Key]
  >;
};

function createRepository(): MockRepository {
  return {
    initialize: jest.fn<PaperBalanceRepository['initialize']>(),
    getBalance: jest.fn<PaperBalanceRepository['getBalance']>(),
    getBalances: jest.fn<PaperBalanceRepository['getBalances']>(),
    credit: jest.fn<PaperBalanceRepository['credit']>(),
    debit: jest.fn<PaperBalanceRepository['debit']>(),
  };
}
