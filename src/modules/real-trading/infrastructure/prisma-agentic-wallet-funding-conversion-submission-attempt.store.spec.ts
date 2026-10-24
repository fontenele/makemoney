import { createHash } from 'node:crypto';

import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletFundingConversionSubmissionClaim,
  FundingConversionSubmissionClaimBlockedError,
  FundingConversionSubmissionClaimConflictError,
} from '../application/agentic-wallet-funding-conversion-submission-attempt.store';
import { PrismaAgenticWalletFundingConversionSubmissionAttemptStore } from './prisma-agentic-wallet-funding-conversion-submission-attempt.store';

describe('PrismaAgenticWalletFundingConversionSubmissionAttemptStore', () => {
  it('atomically consumes a ready plan without retaining the raw phrase', async () => {
    const input = claim();
    const create = jest.fn((value: { data: Record<string, unknown> }) =>
      Promise.resolve({
        ...value.data,
        providerOrderId: null,
        responseFingerprint: null,
        completedAt: null,
      }),
    );
    const tx = {
      $executeRaw: jest.fn(() => Promise.resolve(0)),
      agenticWalletFundingConversionSubmissionAttempt: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        create,
      },
      agenticWalletFundingConversionPlan: {
        findUnique: jest.fn(() => Promise.resolve(plan(input))),
      },
    };
    const store =
      new PrismaAgenticWalletFundingConversionSubmissionAttemptStore({
        $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) =>
          work(tx),
        ),
      } as unknown as PrismaService);

    const result = await store.claim(input);

    expect(result).toMatchObject({
      replayed: false,
      attempt: {
        id: input.id,
        planId: input.planId,
        state: 'submission_claimed',
        automaticRetryAllowed: false,
      },
    });
    expect(JSON.stringify(create.mock.calls)).not.toContain(
      input.confirmationPhrase,
    );
  });

  it.each([
    ['confirmation phrase', { confirmationPhrase: 'wrong phrase' }],
    ['source quantity', { freshSourceQuantityBnb: '0.007' }],
    ['fresh minimum', { freshMinimumUsdt: '5.80' }],
    ['slippage', { freshMaximumSlippagePercent: '0.6' }],
    ['gas reserve', { freshRemainingQuantityBnb: '0.0009' }],
    ['balance block', { preConversionBalanceBlockNumber: '291' }],
    ['BNB balance', { preConversionBnbBalance: '-1' }],
    ['provider fee rate', { providerFeeRate: '0.005' }],
    ['provider fee value', { providerFeeUsd: '0.03' }],
    [
      'fee evidence chronology',
      { feeEvidenceObservedAt: new Date('2026-10-22T12:00:29.499Z') },
    ],
    [
      'confirmation expiry',
      { startedAt: new Date('2026-10-22T12:01:03.000Z') },
    ],
  ])('blocks invalid %s before insertion', async (_label, changed) => {
    const input = { ...claim(), ...changed };
    const create = jest.fn();
    const tx = {
      $executeRaw: jest.fn(() => Promise.resolve(0)),
      agenticWalletFundingConversionSubmissionAttempt: {
        findUnique: jest.fn(() => Promise.resolve(null)),
        create,
      },
      agenticWalletFundingConversionPlan: {
        findUnique: jest.fn(() => Promise.resolve(plan(claim()))),
      },
    };
    const store =
      new PrismaAgenticWalletFundingConversionSubmissionAttemptStore({
        $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) =>
          work(tx),
        ),
      } as unknown as PrismaService);

    await expect(store.claim(input)).rejects.toBeInstanceOf(
      FundingConversionSubmissionClaimBlockedError,
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('does not permit a second request to consume the same plan', async () => {
    const input = claim();
    const tx = {
      $executeRaw: jest.fn(() => Promise.resolve(0)),
      agenticWalletFundingConversionSubmissionAttempt: {
        findUnique: jest.fn(() =>
          Promise.resolve({
            id: input.id,
            planId: input.planId,
            requestFingerprint: 'f'.repeat(64),
            freshSourceQuantityBnb: input.freshSourceQuantityBnb,
            freshExpectedUsdt: input.freshExpectedUsdt,
            freshMinimumUsdt: input.freshMinimumUsdt,
            freshMaximumSlippagePercent: input.freshMaximumSlippagePercent,
            freshRemainingQuantityBnb: input.freshRemainingQuantityBnb,
            preConversionWalletAddress: input.preConversionWalletAddress,
            preConversionBalanceBlockNumber:
              input.preConversionBalanceBlockNumber,
            preConversionBnbBalance: input.preConversionBnbBalance,
            preConversionUsdtBalance: input.preConversionUsdtBalance,
            preConversionBalanceObservedAt:
              input.preConversionBalanceObservedAt,
            providerFeeRate: input.providerFeeRate,
            providerFeeUsd: input.providerFeeUsd,
            estimatedNetworkFeeUsd: input.estimatedNetworkFeeUsd,
            feeEvidenceGasMode: input.feeEvidenceGasMode,
            feeEvidenceObservedAt: input.feeEvidenceObservedAt,
            state: 'submission_claimed',
            automaticRetryAllowed: false,
            startedAt: input.startedAt,
          }),
        ),
      },
    };
    const store =
      new PrismaAgenticWalletFundingConversionSubmissionAttemptStore({
        $transaction: jest.fn((work: (client: typeof tx) => Promise<unknown>) =>
          work(tx),
        ),
      } as unknown as PrismaService);

    await expect(store.claim(input)).rejects.toBeInstanceOf(
      FundingConversionSubmissionClaimConflictError,
    );
  });
});

function claim(): AgenticWalletFundingConversionSubmissionClaim {
  return {
    id: '019a0db1-bfea-7000-8000-000000000002',
    planId: '019a0db1-bfea-7000-8000-000000000001',
    planFingerprint: 'a'.repeat(64),
    confirmationPhrase: 'CONFIRM_BNB_TO_USDT exact one-time phrase',
    freshSourceQuantityBnb: '0.008',
    freshExpectedUsdt: '5.95',
    freshMinimumUsdt: '5.92025',
    freshMaximumSlippagePercent: '0.5',
    freshRemainingQuantityBnb: '0.00175323',
    preConversionWalletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    preConversionBalanceBlockNumber: '0x123',
    preConversionBnbBalance: '0.00975323',
    preConversionUsdtBalance: '0',
    preConversionBalanceObservedAt: new Date('2026-10-22T12:00:29.500Z'),
    providerFeeRate: '0',
    providerFeeUsd: '0',
    estimatedNetworkFeeUsd: '0.003',
    feeEvidenceGasMode: 'fast',
    feeEvidenceObservedAt: new Date('2026-10-22T12:00:29.750Z'),
    startedAt: new Date('2026-10-22T12:00:30.000Z'),
  };
}

function plan(input: AgenticWalletFundingConversionSubmissionClaim) {
  return {
    id: input.planId,
    fingerprint: input.planFingerprint,
    confirmationPhraseDigest: createHash('sha256')
      .update(input.confirmationPhrase)
      .digest('hex'),
    executionConfigurationReady: true,
    sourceQuantityBnb: '0.008',
    minimumUsdt: '5.8904',
    maximumSlippagePercent: '0.5',
    minimumGasReserveBnb: '0.001',
    confirmationExpiresAt: new Date('2026-10-22T12:01:02.000Z'),
  };
}
