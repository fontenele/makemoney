import { createHash } from 'node:crypto';

import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT,
  prepareFundingConversionAccountingBootstrap,
} from '../application/agentic-wallet-funding-conversion-accounting-bootstrap';
import { FundingConversionAccountingBootstrapStoreRequest } from '../application/agentic-wallet-funding-conversion-accounting-bootstrap.store';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from '../application/real-execution-instrument-approval';
import { BSC_NATIVE_BNB_ADDRESS } from './agentic-wallet-funding-conversion-quote.adapter';
import {
  FundingConversionAccountingBootstrapBlockedError,
  FundingConversionAccountingBootstrapConflictError,
} from '../application/agentic-wallet-funding-conversion-accounting-bootstrap.store';
import { PrismaAgenticWalletFundingConversionAccountingBootstrapStore } from './prisma-agentic-wallet-funding-conversion-accounting-bootstrap.store';

const ATTEMPT_ID = '019a0db1-bfea-7000-8000-000000000002';
const PLAN_ID = '019a0db1-bfea-7000-8000-000000000001';
const STATUS_ID = '019a0db1-bfea-7000-8000-000000000003';
const RECONCILIATION_ID = '019a0db1-bfea-7000-8000-000000000004';
const BOOTSTRAP_ID = '019a0db1-bfea-7000-8000-000000000005';
const HASH = `0x${'a'.repeat(64)}`;
const WALLET = '0x1111111111111111111111111111111111111111';
const SNAPSHOT_AT = new Date('2026-10-27T14:00:00.000Z');
const PREPARED_AT = new Date('2026-10-27T14:00:01.000Z');
const APPLIED_AT = new Date('2026-10-27T14:00:02.000Z');

describe('PrismaAgenticWalletFundingConversionAccountingBootstrapStore', () => {
  it('atomically records the origin, compatible initialization, and balances', async () => {
    const request = validRequest();
    const tx = transactionDouble(request);

    const result = await storeWith(tx).apply(request);

    expect(tx.$executeRaw).toHaveBeenCalledTimes(1);
    expect(
      tx.realExecutionAccountingBalanceInitialization.create,
    ).toHaveBeenCalledTimes(1);
    expect(tx.realExecutionAccountingBalance.create).toHaveBeenCalledTimes(3);
    expect(
      tx.agenticWalletFundingConversionAccountingBootstrap.create,
    ).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      replayed: false,
      applied: {
        initializationId: BOOTSTRAP_ID,
        accountingBalancesInitialized: true,
        accountingBootstrapComplete: true,
        ordinaryAccountingSynchronizationApplied: false,
        historicalLedgerContinuityClaimed: false,
        historicalBtcbContinuityClaimed: false,
        strategyExecutionAuthorized: false,
        automaticRetryAllowed: false,
      },
    });
  });

  it('returns exact replay before mutable context reads', async () => {
    const request = validRequest();
    const tx = transactionDouble(request);
    const store = storeWith(tx);
    const first = await store.apply(request);
    tx.replayCreatedBootstrap();

    const replay = await store.apply(request);

    expect(replay).toEqual({ applied: first.applied, replayed: true });
    expect(
      tx.agenticWalletFundingConversionFinancialReconciliation.findUnique,
    ).toHaveBeenCalledTimes(1);
    expect(tx.realExecutionAccountingBalance.create).toHaveBeenCalledTimes(3);
  });

  it('blocks nonempty accounting state before any write', async () => {
    const request = validRequest();
    const tx = transactionDouble(request);
    tx.realExecutionAccountingBalance.count.mockResolvedValue(1);

    await expect(storeWith(tx).apply(request)).rejects.toBeInstanceOf(
      FundingConversionAccountingBootstrapBlockedError,
    );
    expect(
      tx.realExecutionAccountingBalanceInitialization.create,
    ).not.toHaveBeenCalled();
    expect(tx.realExecutionAccountingBalance.create).not.toHaveBeenCalled();
  });

  it('rejects divergent replay and stale application', async () => {
    const request = validRequest();
    const tx = transactionDouble(request);
    await storeWith(tx).apply(request);
    tx.replayCreatedBootstrap('0'.repeat(64));

    await expect(storeWith(tx).apply(request)).rejects.toBeInstanceOf(
      FundingConversionAccountingBootstrapBlockedError,
    );

    const fresh = transactionDouble(request);
    await expect(
      storeWith(fresh, new Date('2026-10-27T14:01:00.001Z')).apply(request),
    ).rejects.toBeInstanceOf(FundingConversionAccountingBootstrapBlockedError);
    expect(
      fresh.realExecutionAccountingBalanceInitialization.create,
    ).not.toHaveBeenCalled();
  });

  it('rejects reuse of a correlation by another bootstrap', async () => {
    const request = validRequest();
    const tx = transactionDouble(request);
    await storeWith(tx).apply(request);
    tx.replayCreatedBootstrap(undefined, {
      id: '019a0db1-bfea-7000-8000-000000000099',
      initializationId: '019a0db1-bfea-7000-8000-000000000099',
    });

    await expect(storeWith(tx).apply(request)).rejects.toBeInstanceOf(
      FundingConversionAccountingBootstrapConflictError,
    );
  });
});

function storeWith(tx: ReturnType<typeof transactionDouble>, now = APPLIED_AT) {
  const prisma = {
    $transaction: jest.fn((operation: (value: typeof tx) => unknown) =>
      Promise.resolve(operation(tx)),
    ),
  } as unknown as PrismaService;
  return new PrismaAgenticWalletFundingConversionAccountingBootstrapStore(
    prisma,
    () => new Date(now),
  );
}

function transactionDouble(
  request: FundingConversionAccountingBootstrapStoreRequest,
) {
  let createdBootstrap: Record<string, unknown> | null = null;
  const findBootstrap = jest.fn<() => Promise<Record<string, unknown> | null>>(
    () => Promise.resolve(null),
  );
  const bootstrapCreate = jest.fn(
    ({ data }: { data: Record<string, unknown> }) => {
      createdBootstrap = { ...data };
      return Promise.resolve(createdBootstrap);
    },
  );
  return {
    replayCreatedBootstrap(
      requestFingerprint?: string,
      overrides: Record<string, unknown> = {},
    ) {
      if (createdBootstrap === null) throw new Error('Missing created row');
      findBootstrap.mockResolvedValue({
        ...createdBootstrap,
        ...(requestFingerprint === undefined ? {} : { requestFingerprint }),
        ...overrides,
      });
    },
    $executeRaw: jest.fn().mockResolvedValue(1),
    agenticWalletFundingConversionAccountingBootstrap: {
      findFirst: findBootstrap,
      create: bootstrapCreate,
    },
    agenticWalletFundingConversionFinancialReconciliation: {
      findUnique: jest.fn().mockResolvedValue(reconciliationRow(request)),
    },
    agenticWalletFundingConversionSubmissionAttempt: {
      findUnique: jest.fn().mockResolvedValue(attemptRow(request)),
    },
    realExecutionAccountingBalanceInitialization: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(data),
      ),
    },
    realExecutionAccountingBalance: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn(({ data }: { data: Record<string, unknown> }) =>
        Promise.resolve(data),
      ),
    },
    agenticWalletFundingConversionAccountingSync: {
      count: jest.fn().mockResolvedValue(0),
    },
  };
}

function validRequest(): FundingConversionAccountingBootstrapStoreRequest {
  const reconciliation = reconciliationValue();
  const context = contextValue();
  const snapshot = snapshotValue();
  const absence = {
    scope: 'funding_conversion_accounting_absence_evidence' as const,
    initializationCount: 0,
    balanceCount: 0,
    synchronizationCount: 0,
    inspectedAt: new Date('2026-10-27T14:00:00.500Z'),
  };
  const assessment = prepareFundingConversionAccountingBootstrap(
    reconciliation,
    context,
    snapshot,
    absence,
    {
      bootstrapId: BOOTSTRAP_ID,
      acknowledgment: FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT,
      maximumSnapshotAgeMs: 60_000,
      preparedAt: PREPARED_AT,
    },
  );
  if (assessment.bootstrap === null) throw new Error('Expected bootstrap');
  return {
    bootstrap: assessment.bootstrap,
    reconciliation,
    context,
    snapshot,
    absence,
  };
}

function reconciliationValue() {
  return {
    id: RECONCILIATION_ID,
    attemptId: ATTEMPT_ID,
    planId: PLAN_ID,
    expectedUsdt: '5.95',
    minimumUsdt: '5.92',
    outputAssessment: 'minimum_satisfied_below_expected' as const,
    evidence: {
      scope:
        'agentic_wallet_funding_conversion_financial_reconciliation_evidence' as const,
      attemptId: ATTEMPT_ID,
      providerOrderId: 'order_123',
      statusObservationId: STATUS_ID,
      transactionHash: HASH,
      chainId: '56',
      sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(),
      targetTokenAddress:
        APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT.usdt.tokenAddress,
      submittedSourceQuantityBnb: '0.4',
      actualUsdtReceived: '5.93',
      providerFeeComponents: [] as {
        assetAddress: string;
        quantity: string;
      }[],
      networkFeeAsset: 'BNB',
      networkFeeQuantityBnb: '0.005',
      transactionReceiptObserved: true as const,
      sourceBalanceDeltaObserved: true as const,
      targetBalanceDeltaObserved: true as const,
      providerFeeCoverageComplete: true as const,
      networkFeeCoverageComplete: true as const,
      observedAt: new Date('2026-10-27T13:59:00.000Z'),
    },
    recordedAt: new Date('2026-10-27T13:59:01.000Z'),
    financialReconciliationComplete: true as const,
    automaticRetryAllowed: false as const,
  };
}

function contextValue() {
  return {
    reconciliation: {
      scope:
        'agentic_wallet_funding_conversion_financial_reconciliation_context' as const,
      attemptId: ATTEMPT_ID,
      planId: PLAN_ID,
      providerOrderId: 'order_123',
      sourceQuantityBnb: '0.4',
      expectedUsdt: '5.95',
      minimumUsdt: '5.92',
      statusObservation: {
        id: STATUS_ID,
        observation: {
          attemptId: ATTEMPT_ID,
          providerOrderId: 'order_123',
          providerStatus: 'FINISHED',
          transactionHash: HASH,
          bookedAt: new Date('2026-10-27T13:50:00.000Z'),
          providerUpdatedAt: new Date('2026-10-27T13:55:00.000Z'),
          terminal: true as const,
          executionSucceeded: true as const,
          financialReconciliationRequired: true as const,
          financialReconciliationComplete: false as const,
          automaticRetryAllowed: false as const,
        },
        recordedAt: new Date('2026-10-27T13:55:01.000Z'),
      },
    },
    walletAddress: WALLET,
    preBalanceBlockNumber: '0x10',
    preBnbBalance: '1',
    preUsdtBalance: '0',
    preBalanceObservedAt: new Date('2026-10-27T13:49:00.000Z'),
    providerFeeRate: '0',
    providerFeeUsd: '0',
    feeEvidenceObservedAt: new Date('2026-10-27T13:49:30.000Z'),
  };
}

function snapshotValue() {
  const instrument = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  return {
    scope: 'agentic_wallet_funding_conversion_accounting_snapshot' as const,
    chainId: '56' as const,
    walletAddress: WALLET,
    blockNumber: '0x20',
    balances: [
      {
        assetIdentity: 'native:BNB',
        assetType: 'native' as const,
        assetAddress: null,
        assetSymbol: 'BNB',
        quantity: '0.595',
      },
      {
        assetIdentity: `token:${instrument.usdt.tokenAddress}`,
        assetType: 'token' as const,
        assetAddress: instrument.usdt.tokenAddress,
        assetSymbol: null,
        quantity: '5.93',
      },
      {
        assetIdentity: `token:${instrument.btc.tokenAddress}`,
        assetType: 'token' as const,
        assetAddress: instrument.btc.tokenAddress,
        assetSymbol: null,
        quantity: '0',
      },
    ],
    observedAt: SNAPSHOT_AT,
  };
}

function attemptRow(request: FundingConversionAccountingBootstrapStoreRequest) {
  const context = request.context;
  return {
    id: ATTEMPT_ID,
    planId: PLAN_ID,
    providerOrderId: 'order_123',
    state: 'provider_finished_pending_financial_reconciliation',
    automaticRetryAllowed: false,
    freshSourceQuantityBnb: context.reconciliation.sourceQuantityBnb,
    freshExpectedUsdt: context.reconciliation.expectedUsdt,
    freshMinimumUsdt: context.reconciliation.minimumUsdt,
    preConversionWalletAddress: context.walletAddress,
    preConversionBalanceBlockNumber: context.preBalanceBlockNumber,
    preConversionBnbBalance: context.preBnbBalance,
    preConversionUsdtBalance: context.preUsdtBalance,
    preConversionBalanceObservedAt: context.preBalanceObservedAt,
    providerFeeRate: context.providerFeeRate,
    providerFeeUsd: context.providerFeeUsd,
    feeEvidenceObservedAt: context.feeEvidenceObservedAt,
  };
}

function reconciliationRow(
  request: FundingConversionAccountingBootstrapStoreRequest,
) {
  const reconciliation = request.reconciliation;
  const evidence = reconciliation.evidence;
  const row = {
    id: reconciliation.id,
    attemptId: reconciliation.attemptId,
    planId: reconciliation.planId,
    statusObservationId: evidence.statusObservationId,
    providerOrderId: evidence.providerOrderId,
    transactionHash: evidence.transactionHash,
    chainId: evidence.chainId,
    sourceTokenAddress: evidence.sourceTokenAddress,
    targetTokenAddress: evidence.targetTokenAddress,
    submittedSourceQuantityBnb: evidence.submittedSourceQuantityBnb,
    expectedUsdt: reconciliation.expectedUsdt,
    minimumUsdt: reconciliation.minimumUsdt,
    actualUsdtReceived: evidence.actualUsdtReceived,
    outputAssessment: reconciliation.outputAssessment,
    providerFeeComponents: evidence.providerFeeComponents,
    networkFeeAsset: evidence.networkFeeAsset,
    networkFeeQuantityBnb: evidence.networkFeeQuantityBnb,
    observedAt: evidence.observedAt,
    requestFingerprint: '',
    recordedAt: reconciliation.recordedAt,
  };
  return {
    ...row,
    requestFingerprint: reconciliationFingerprint(reconciliation),
  };
}

function reconciliationFingerprint(
  reconciliation: ReturnType<typeof reconciliationValue>,
): string {
  const evidence = {
    ...reconciliation.evidence,
    providerFeeComponents: [
      ...reconciliation.evidence.providerFeeComponents,
    ].sort((left, right) =>
      left.assetAddress.localeCompare(right.assetAddress),
    ),
  };
  return createHash('sha256')
    .update(
      JSON.stringify(
        canonicalize({
          evidence,
          expectedUsdt: reconciliation.expectedUsdt,
          id: reconciliation.id,
          minimumUsdt: reconciliation.minimumUsdt,
          planId: reconciliation.planId,
        }),
      ),
    )
    .digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  return value;
}
