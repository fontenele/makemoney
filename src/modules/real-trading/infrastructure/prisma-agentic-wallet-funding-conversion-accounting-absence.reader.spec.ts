import { jest } from '@jest/globals';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { PrismaAgenticWalletFundingConversionAccountingAbsenceReader } from './prisma-agentic-wallet-funding-conversion-accounting-absence.reader';

describe('PrismaAgenticWalletFundingConversionAccountingAbsenceReader', () => {
  it('reads all three accounting surfaces in one serializable snapshot', async () => {
    const tx = transactionDouble(1, 2, 3);
    const transaction = jest.fn(
      (operation: (value: typeof tx) => unknown, options: unknown) => {
        expect(options).toEqual({
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        });
        return Promise.resolve(operation(tx));
      },
    );
    const reader =
      new PrismaAgenticWalletFundingConversionAccountingAbsenceReader(
        { $transaction: transaction } as unknown as PrismaService,
        () => new Date('2026-10-27T14:00:00.000Z'),
      );

    await expect(reader.inspect()).resolves.toEqual({
      scope: 'funding_conversion_accounting_absence_evidence',
      initializationCount: 1,
      balanceCount: 2,
      synchronizationCount: 3,
      inspectedAt: new Date('2026-10-27T14:00:00.000Z'),
    });
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid inspection time', async () => {
    const tx = transactionDouble(0, 0, 0);
    const prisma = {
      $transaction: jest.fn((operation: (value: typeof tx) => unknown) =>
        Promise.resolve(operation(tx)),
      ),
    } as unknown as PrismaService;
    const reader =
      new PrismaAgenticWalletFundingConversionAccountingAbsenceReader(
        prisma,
        () => new Date(Number.NaN),
      );

    await expect(reader.inspect()).rejects.toThrow(
      'Funding conversion accounting inspection time is invalid',
    );
  });
});

function transactionDouble(
  initializationCount: number,
  balanceCount: number,
  synchronizationCount: number,
) {
  return {
    realExecutionAccountingBalanceInitialization: {
      count: jest.fn().mockResolvedValue(initializationCount),
    },
    realExecutionAccountingBalance: {
      count: jest.fn().mockResolvedValue(balanceCount),
    },
    agenticWalletFundingConversionAccountingSync: {
      count: jest.fn().mockResolvedValue(synchronizationCount),
    },
  };
}
