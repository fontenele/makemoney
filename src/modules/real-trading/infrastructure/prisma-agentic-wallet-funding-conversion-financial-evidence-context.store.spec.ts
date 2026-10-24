import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  FundingConversionFinancialEvidenceContextInvalidError,
  PrismaAgenticWalletFundingConversionFinancialEvidenceContextStore,
} from './prisma-agentic-wallet-funding-conversion-financial-evidence-context.store';

const ATTEMPT_ID = '019a0db1-bfea-7000-8000-000000000002';
const PLAN_ID = '019a0db1-bfea-7000-8000-000000000001';
const STATUS_ID = '019a0db1-bfea-7000-8000-000000000003';
const HASH = `0x${'a'.repeat(64)}`;

describe('PrismaAgenticWalletFundingConversionFinancialEvidenceContextStore', () => {
  it('reconstructs the exact terminal evidence context', async () => {
    const findUnique = jest.fn(() => Promise.resolve(row()));
    const store = createStore(findUnique);

    await expect(store.getByAttemptId(ATTEMPT_ID)).resolves.toMatchObject({
      reconciliation: {
        attemptId: ATTEMPT_ID,
        planId: PLAN_ID,
        providerOrderId: '1234567890',
        sourceQuantityBnb: '0.008',
        statusObservation: {
          id: STATUS_ID,
          observation: { providerStatus: 'FINISHED', transactionHash: HASH },
        },
      },
      walletAddress: '0x1111111111111111111111111111111111111111',
      preBalanceBlockNumber: '0x10',
      preBnbBalance: '1',
      preUsdtBalance: '10',
      providerFeeRate: '0',
      providerFeeUsd: '0',
    });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: ATTEMPT_ID },
      include: {
        plan: true,
        statusObservations: {
          where: { providerStatus: 'FINISHED' },
          orderBy: [{ providerUpdatedAt: 'desc' }, { id: 'desc' }],
          take: 1,
        },
      },
    });
  });

  it('returns absence for an unknown canonical attempt', async () => {
    const store = createStore(jest.fn(() => Promise.resolve(null)));
    await expect(store.getByAttemptId(ATTEMPT_ID)).resolves.toBeNull();
  });

  it('rejects malformed identity before persistence access', async () => {
    const findUnique = jest.fn();
    await expect(
      createStore(findUnique).getByAttemptId('invalid'),
    ).rejects.toBeInstanceOf(
      FundingConversionFinancialEvidenceContextInvalidError,
    );
    expect(findUnique).not.toHaveBeenCalled();
  });

  it.each([
    ['state', { state: 'submitted_pending_confirmation' }],
    ['wallet', { preConversionWalletAddress: null }],
    ['fee', { providerFeeRate: '0.01' }],
    ['terminal status', { statusObservations: [] }],
  ])('rejects corrupt durable %s', async (_label, changed) => {
    const store = createStore(
      jest.fn(() => Promise.resolve({ ...row(), ...changed })),
    );
    await expect(store.getByAttemptId(ATTEMPT_ID)).rejects.toBeInstanceOf(
      FundingConversionFinancialEvidenceContextInvalidError,
    );
  });
});

function createStore(findUnique: jest.Mock) {
  return new PrismaAgenticWalletFundingConversionFinancialEvidenceContextStore({
    agenticWalletFundingConversionSubmissionAttempt: { findUnique },
  } as unknown as PrismaService);
}

function row() {
  return {
    id: ATTEMPT_ID,
    planId: PLAN_ID,
    plan: { id: PLAN_ID },
    state: 'provider_finished_pending_financial_reconciliation',
    automaticRetryAllowed: false,
    providerOrderId: '1234567890',
    freshSourceQuantityBnb: '0.008',
    freshExpectedUsdt: '5.95',
    freshMinimumUsdt: '5.9',
    preConversionWalletAddress: '0x1111111111111111111111111111111111111111',
    preConversionBalanceBlockNumber: '0x10',
    preConversionBnbBalance: '1',
    preConversionUsdtBalance: '10',
    preConversionBalanceObservedAt: new Date('2026-10-24T11:50:00.000Z'),
    providerFeeRate: '0',
    providerFeeUsd: '0',
    feeEvidenceObservedAt: new Date('2026-10-24T11:51:00.000Z'),
    statusObservations: [
      {
        id: STATUS_ID,
        attemptId: ATTEMPT_ID,
        providerOrderId: '1234567890',
        providerStatus: 'FINISHED',
        transactionHash: HASH,
        bookedAt: new Date('2026-10-24T11:58:00.000Z'),
        providerUpdatedAt: new Date('2026-10-24T11:59:10.000Z'),
        recordedAt: new Date('2026-10-24T11:59:30.000Z'),
      },
    ],
  };
}
