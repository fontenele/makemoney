import { jest } from '@jest/globals';

import {
  AgenticWalletFundingConversionCompleteFinancialEvidenceReader,
  FundingConversionFinancialEvidenceInvalidError,
} from './agentic-wallet-funding-conversion-financial-evidence.reader';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';

const ATTEMPT_ID = '019a0db1-bfea-7000-8000-000000000002';
const STATUS_ID = '019a0db1-bfea-7000-8000-000000000003';
const PLAN_ID = '019a0db1-bfea-7000-8000-000000000001';
const HASH = `0x${'a'.repeat(64)}`;
const WALLET = '0x1111111111111111111111111111111111111111';

describe('AgenticWalletFundingConversionCompleteFinancialEvidenceReader', () => {
  it('composes complete evidence from receipt and exact fixed-block deltas', async () => {
    const { reader, receiptLoad, postLoad } = createReader();

    await expect(reader.load(ATTEMPT_ID)).resolves.toEqual({
      status: 'evidence_available',
      evidence: {
        scope:
          'agentic_wallet_funding_conversion_financial_reconciliation_evidence',
        attemptId: ATTEMPT_ID,
        providerOrderId: '1234567890',
        statusObservationId: STATUS_ID,
        transactionHash: HASH,
        chainId: '56',
        sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(),
        targetTokenAddress: BSC_USDT_ADDRESS.toLowerCase(),
        submittedSourceQuantityBnb: '0.008',
        actualUsdtReceived: '5.9',
        providerFeeComponents: [],
        networkFeeAsset: 'BNB',
        networkFeeQuantityBnb: '0.00001',
        transactionReceiptObserved: true,
        sourceBalanceDeltaObserved: true,
        targetBalanceDeltaObserved: true,
        providerFeeCoverageComplete: true,
        networkFeeCoverageComplete: true,
        observedAt: new Date('2026-10-24T12:01:00.000Z'),
      },
    });
    expect(receiptLoad).toHaveBeenCalledWith(HASH, undefined);
    expect(postLoad).toHaveBeenCalledWith(WALLET, undefined);
  });

  it('returns explicit absence before external evidence reads', async () => {
    const receiptLoad = jest.fn();
    const postLoad = jest.fn();
    const reader =
      new AgenticWalletFundingConversionCompleteFinancialEvidenceReader(
        {
          getByAttemptId: () => Promise.resolve(null),
        },
        {
          load: receiptLoad,
        },
        {
          load: postLoad,
        },
      );
    await expect(reader.load(ATTEMPT_ID)).resolves.toEqual({
      status: 'evidence_unavailable',
      blockers: ['terminal_funding_conversion_context_unavailable'],
    });
    expect(receiptLoad).not.toHaveBeenCalled();
    expect(postLoad).not.toHaveBeenCalled();
  });

  it.each([
    ['source delta', { bnbBalance: '0.992' }],
    ['target delta', { usdtBalance: '15.89' }],
    [
      'wallet identity',
      { walletAddress: '0x2222222222222222222222222222222222222222' },
    ],
    ['block progression', { blockNumber: '0x10' }],
    [
      'observation chronology',
      { observedAt: new Date('2026-10-24T11:59:30.000Z') },
    ],
  ])('rejects divergent %s evidence', async (_label, changedPost) => {
    const { reader } = createReader(undefined, changedPost);
    await expect(reader.load(ATTEMPT_ID)).rejects.toBeInstanceOf(
      FundingConversionFinancialEvidenceInvalidError,
    );
  });

  it('rejects a receipt whose source quantity diverges from the durable claim', async () => {
    const { reader } = createReader({ sourceQuantityBnb: '0.007' });
    await expect(reader.load(ATTEMPT_ID)).rejects.toBeInstanceOf(
      FundingConversionFinancialEvidenceInvalidError,
    );
  });
});

function createReader(
  changedReceipt: Record<string, unknown> = {},
  changedPost: Record<string, unknown> = {},
) {
  const receiptLoad = jest.fn(() =>
    Promise.resolve({
      scope: 'agentic_wallet_funding_conversion_transaction_receipt' as const,
      transactionHash: HASH,
      chainId: '56' as const,
      walletAddress: WALLET,
      sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(),
      targetTokenAddress: BSC_USDT_ADDRESS.toLowerCase(),
      sourceQuantityBnb: '0.008',
      actualUsdtReceived: '5.9',
      networkFeeQuantityBnb: '0.00001',
      transactionTime: new Date('2026-10-24T11:59:00.000Z'),
      observedAt: new Date('2026-10-24T12:00:00.000Z'),
      ...changedReceipt,
    }),
  );
  const postLoad = jest.fn(() =>
    Promise.resolve({
      scope: 'agentic_wallet_funding_conversion_post_balance_snapshot' as const,
      chainId: '56' as const,
      walletAddress: WALLET,
      blockNumber: '0x11',
      bnbBalance: '0.99199',
      usdtBalance: '15.9',
      observedAt: new Date('2026-10-24T12:01:00.000Z'),
      ...changedPost,
    }),
  );
  const reader =
    new AgenticWalletFundingConversionCompleteFinancialEvidenceReader(
      {
        getByAttemptId: () => Promise.resolve(context()),
      },
      {
        load: receiptLoad,
      },
      {
        load: postLoad,
      },
    );
  return { reader, receiptLoad, postLoad };
}

function context() {
  return {
    reconciliation: {
      scope:
        'agentic_wallet_funding_conversion_financial_reconciliation_context' as const,
      attemptId: ATTEMPT_ID,
      planId: PLAN_ID,
      providerOrderId: '1234567890',
      sourceQuantityBnb: '0.008',
      expectedUsdt: '5.95',
      minimumUsdt: '5.9',
      statusObservation: {
        id: STATUS_ID,
        observation: {
          attemptId: ATTEMPT_ID,
          providerOrderId: '1234567890',
          providerStatus: 'FINISHED' as const,
          transactionHash: HASH,
          bookedAt: new Date('2026-10-24T11:58:00.000Z'),
          providerUpdatedAt: new Date('2026-10-24T11:59:10.000Z'),
          terminal: true,
          executionSucceeded: true,
          financialReconciliationRequired: true as const,
          financialReconciliationComplete: false as const,
          automaticRetryAllowed: false as const,
        },
        recordedAt: new Date('2026-10-24T11:59:30.000Z'),
      },
    },
    walletAddress: WALLET,
    preBalanceBlockNumber: '0x10',
    preBnbBalance: '1',
    preUsdtBalance: '10',
    preBalanceObservedAt: new Date('2026-10-24T11:50:00.000Z'),
    providerFeeRate: '0',
    providerFeeUsd: '0',
    feeEvidenceObservedAt: new Date('2026-10-24T11:51:00.000Z'),
  };
}
