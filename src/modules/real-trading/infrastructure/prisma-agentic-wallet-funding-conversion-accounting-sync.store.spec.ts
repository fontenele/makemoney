import { createHash } from 'node:crypto';
import { jest } from '@jest/globals';

import { ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT } from './agentic-wallet-accounting-balance-initialization';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from '../application/real-execution-instrument-approval';
import {
  FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT,
  FundingConversionAccountingSyncBlockedError,
} from '../application/agentic-wallet-funding-conversion-accounting-sync.store';
import { FundingConversionAccountingSyncRequest } from '../application/agentic-wallet-funding-conversion-accounting-sync.store';
import { BSC_NATIVE_BNB_ADDRESS } from './agentic-wallet-funding-conversion-quote.adapter';
import { PrismaAgenticWalletFundingConversionAccountingSyncStore } from './prisma-agentic-wallet-funding-conversion-accounting-sync.store';

const ATTEMPT_ID = '019a0db1-bfea-7000-8000-000000000002';
const PLAN_ID = '019a0db1-bfea-7000-8000-000000000001';
const STATUS_ID = '019a0db1-bfea-7000-8000-000000000003';
const RECONCILIATION_ID = '019a0db1-bfea-7000-8000-000000000004';
const INITIALIZATION_ID = '019a0db1-bfea-7000-8000-000000000005';
const SYNC_ID = '019a0db1-bfea-7000-8000-000000000006';
const HASH = `0x${'a'.repeat(64)}`;
const WALLET = '0x1111111111111111111111111111111111111111';
const OBSERVED_AT = new Date('2026-10-24T14:00:00.000Z');
const PREPARED_AT = new Date('2026-10-24T14:00:01.000Z');
const APPLIED_AT = new Date('2026-10-24T14:00:02.000Z');

describe('PrismaAgenticWalletFundingConversionAccountingSyncStore', () => {
  it('atomically replaces all exact ledger balances and records a receipt', async () => {
    const harness = createHarness();

    const result = await harness.store.apply(request());

    expect(result.replayed).toBe(false);
    expect(result.synchronized).toMatchObject({
      id: SYNC_ID,
      attemptId: ATTEMPT_ID,
      reconciliationId: RECONCILIATION_ID,
      accountingSynchronizationComplete: true,
      automaticRetryAllowed: false,
    });
    expect(harness.updateMany).toHaveBeenCalledTimes(3);
    expect(harness.updateMany).toHaveBeenCalledWith({
      where: { assetIdentity: 'native:BNB', quantity: '1' },
      data: { quantity: '0.99198', updatedAt: APPLIED_AT },
    });
    expect(harness.create).toHaveBeenCalledTimes(1);
  });

  it('rejects wallet divergence before any ledger mutation', async () => {
    const harness = createHarness();
    const divergent = request();
    divergent.snapshot.balances[0] = {
      ...divergent.snapshot.balances[0],
      quantity: '0.9',
    };

    await expect(harness.store.apply(divergent)).rejects.toBeInstanceOf(
      FundingConversionAccountingSyncBlockedError,
    );
    expect(harness.updateMany).not.toHaveBeenCalled();
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rolls back the receipt when a conditional balance update loses a race', async () => {
    const harness = createHarness();
    harness.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(harness.store.apply(request())).rejects.toMatchObject({
      blockers: ['concurrent_ledger_change'],
    });
    expect(harness.create).not.toHaveBeenCalled();
  });
});

function createHarness() {
  const sync = {
    findFirst: jest.fn(() => Promise.resolve(null)),
    create: jest.fn(),
  };
  const updateMany = jest.fn(() => Promise.resolve({ count: 1 }));
  const create = sync.create.mockImplementation(
    (input: { data: Record<string, unknown> }) =>
      Promise.resolve({ ...input.data }),
  );
  const tx = {
    $executeRaw: jest.fn(() => Promise.resolve(0)),
    agenticWalletFundingConversionAccountingSync: sync,
    agenticWalletFundingConversionFinancialReconciliation: {
      findUnique: jest.fn(() => Promise.resolve(reconciliationRow())),
    },
    agenticWalletFundingConversionSubmissionAttempt: {
      findUnique: jest.fn(() => Promise.resolve(attemptRow())),
    },
    realExecutionAccountingBalanceInitialization: {
      findUnique: jest.fn(() => Promise.resolve(initializationRow())),
    },
    realExecutionAccountingBalance: {
      findMany: jest.fn(() => Promise.resolve(balanceRows())),
      updateMany,
    },
  };
  const prisma = {
    $transaction: jest.fn((callback: (value: typeof tx) => unknown) =>
      callback(tx),
    ),
    agenticWalletFundingConversionAccountingSync: {
      findUnique: jest.fn(),
    },
  };
  return {
    updateMany,
    create,
    store: new PrismaAgenticWalletFundingConversionAccountingSyncStore(
      prisma as never,
      () => APPLIED_AT,
    ),
  };
}

function request(): FundingConversionAccountingSyncRequest & {
  snapshot: FundingConversionAccountingSyncRequest['snapshot'] & {
    balances: Array<
      FundingConversionAccountingSyncRequest['snapshot']['balances'][number]
    >;
  };
} {
  const instrument = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  return {
    id: SYNC_ID,
    initializationId: INITIALIZATION_ID,
    reconciliation: storedReconciliation(),
    context: {
      reconciliation: {
        scope:
          'agentic_wallet_funding_conversion_financial_reconciliation_context',
        attemptId: ATTEMPT_ID,
        planId: PLAN_ID,
        providerOrderId: 'order_123',
        sourceQuantityBnb: '0.008',
        expectedUsdt: '5.95',
        minimumUsdt: '5.92',
        statusObservation: statusObservation(),
      },
      walletAddress: WALLET,
      preBalanceBlockNumber: '0x10',
      preBnbBalance: '1',
      preUsdtBalance: '0',
      preBalanceObservedAt: new Date('2026-10-24T13:49:00.000Z'),
      providerFeeRate: '0',
      providerFeeUsd: '0',
      feeEvidenceObservedAt: new Date('2026-10-24T13:49:30.000Z'),
    },
    snapshot: {
      scope: 'agentic_wallet_funding_conversion_accounting_snapshot',
      chainId: '56',
      walletAddress: WALLET,
      blockNumber: '0x20',
      balances: [
        balance('native:BNB', '0.99198'),
        balance(`token:${instrument.usdt.tokenAddress}`, '5.93'),
        balance(`token:${instrument.btc.tokenAddress}`, '0'),
      ],
      observedAt: OBSERVED_AT,
    },
    acknowledgment: FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT,
    preparedAt: PREPARED_AT,
  };
}

function storedReconciliation() {
  return {
    id: RECONCILIATION_ID,
    attemptId: ATTEMPT_ID,
    planId: PLAN_ID,
    expectedUsdt: '5.95',
    minimumUsdt: '5.92',
    outputAssessment: 'minimum_satisfied_below_expected' as const,
    evidence: evidence(),
    recordedAt: new Date('2026-10-24T13:59:01.000Z'),
    financialReconciliationComplete: true as const,
    automaticRetryAllowed: false as const,
  };
}

function evidence() {
  return {
    scope:
      'agentic_wallet_funding_conversion_financial_reconciliation_evidence' as const,
    attemptId: ATTEMPT_ID,
    providerOrderId: 'order_123',
    statusObservationId: STATUS_ID,
    transactionHash: HASH,
    chainId: '56' as const,
    sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(),
    targetTokenAddress:
      APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT.usdt.tokenAddress,
    submittedSourceQuantityBnb: '0.008',
    actualUsdtReceived: '5.93',
    providerFeeComponents: [],
    networkFeeAsset: 'BNB' as const,
    networkFeeQuantityBnb: '0.00002',
    transactionReceiptObserved: true as const,
    sourceBalanceDeltaObserved: true as const,
    targetBalanceDeltaObserved: true as const,
    providerFeeCoverageComplete: true as const,
    networkFeeCoverageComplete: true as const,
    observedAt: new Date('2026-10-24T13:59:00.000Z'),
  };
}

function reconciliationRow() {
  const value = storedReconciliation();
  return {
    id: value.id,
    attemptId: value.attemptId,
    planId: value.planId,
    statusObservationId: STATUS_ID,
    providerOrderId: value.evidence.providerOrderId,
    transactionHash: HASH,
    chainId: '56',
    sourceTokenAddress: value.evidence.sourceTokenAddress,
    targetTokenAddress: value.evidence.targetTokenAddress,
    submittedSourceQuantityBnb: '0.008',
    expectedUsdt: '5.95',
    minimumUsdt: '5.92',
    actualUsdtReceived: '5.93',
    outputAssessment: 'minimum_satisfied_below_expected',
    providerFeeComponents: [],
    networkFeeAsset: 'BNB',
    networkFeeQuantityBnb: '0.00002',
    observedAt: value.evidence.observedAt,
    requestFingerprint: fingerprint({
      evidence: value.evidence,
      expectedUsdt: '5.95',
      id: RECONCILIATION_ID,
      minimumUsdt: '5.92',
      planId: PLAN_ID,
    }),
    recordedAt: value.recordedAt,
  };
}

function attemptRow() {
  return {
    id: ATTEMPT_ID,
    planId: PLAN_ID,
    preConversionWalletAddress: WALLET,
    preConversionBalanceBlockNumber: '0x10',
    preConversionBnbBalance: '1',
    preConversionUsdtBalance: '0',
  };
}

function initializationRow() {
  const initialization = {
    scope: 'agentic_wallet_accounting_balance_initialization' as const,
    initializationId: INITIALIZATION_ID,
    providerId: 'agentic_wallet' as const,
    chainId: '56' as const,
    acknowledgment: ACCOUNTING_BALANCE_INITIALIZATION_ACKNOWLEDGMENT,
    balances: [
      {
        assetType: 'native' as const,
        assetSymbol: 'BNB' as const,
        currentQuantity: '1',
      },
      tokenInitialization('usdt', '0'),
      tokenInitialization('btc', '0'),
    ],
    balanceCoverageComplete: true as const,
    walletObservedAt: new Date('2026-10-24T13:48:00.000Z'),
    maximumObservationAgeMs: 60_000,
    preparedAt: new Date('2026-10-24T13:48:10.000Z'),
    accountingBalanceInitializationPrepared: true as const,
    accountingBalancesInitialized: false as const,
    quoteAuthorized: false as const,
    submissionAuthorized: false as const,
  };
  return {
    id: INITIALIZATION_ID,
    providerId: 'agentic_wallet',
    chainId: '56',
    acknowledgment: initialization.acknowledgment,
    balances: initialization.balances,
    walletObservedAt: initialization.walletObservedAt,
    maximumObservationAgeMs: 60_000,
    preparedAt: initialization.preparedAt,
    requestFingerprint: fingerprint(initialization),
    initializedAt: new Date('2026-10-24T13:48:11.000Z'),
  };
}

function balance(identity: string, quantity: string) {
  if (identity === 'native:BNB')
    return {
      assetIdentity: identity,
      assetType: 'native' as const,
      assetAddress: null,
      assetSymbol: 'BNB',
      quantity,
    };
  return {
    assetIdentity: identity,
    assetType: 'token' as const,
    assetAddress: identity.slice('token:'.length),
    assetSymbol: null,
    quantity,
  };
}

function tokenInitialization(kind: 'usdt' | 'btc', currentQuantity: string) {
  return {
    assetType: 'token' as const,
    assetAddress:
      APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT[kind].tokenAddress,
    currentQuantity,
  };
}

function balanceRows() {
  return request().snapshot.balances.map((entry) => ({
    assetIdentity: entry.assetIdentity,
    assetType: entry.assetType,
    assetAddress: entry.assetAddress,
    assetSymbol: entry.assetSymbol,
    quantity:
      entry.assetIdentity === 'native:BNB'
        ? '1'
        : entry.assetIdentity.includes(
              APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT.usdt
                .tokenAddress,
            )
          ? '0'
          : entry.quantity,
    updatedAt: new Date('2026-10-24T13:48:11.000Z'),
  }));
}

function statusObservation() {
  return {
    id: STATUS_ID,
    observation: {
      attemptId: ATTEMPT_ID,
      providerOrderId: 'order_123',
      providerStatus: 'FINISHED' as const,
      transactionHash: HASH,
      bookedAt: new Date('2026-10-24T13:50:00.000Z'),
      providerUpdatedAt: new Date('2026-10-24T13:55:00.000Z'),
      terminal: true as const,
      executionSucceeded: true as const,
      financialReconciliationRequired: true as const,
      financialReconciliationComplete: false as const,
      automaticRetryAllowed: false as const,
    },
    recordedAt: new Date('2026-10-24T13:55:01.000Z'),
  };
}

function fingerprint(value: unknown): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(value)))
    .digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value))
    return value
      .map(canonicalize)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  return value;
}
