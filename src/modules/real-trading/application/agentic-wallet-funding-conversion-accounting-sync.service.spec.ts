import { jest } from '@jest/globals';

import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import {
  AgenticWalletFundingConversionAccountingSyncService,
  FundingConversionAccountingSyncRequestError,
} from './agentic-wallet-funding-conversion-accounting-sync.service';
import {
  AppliedFundingConversionAccountingSync,
  FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT,
} from './agentic-wallet-funding-conversion-accounting-sync.store';
import { FundingConversionAccountingSnapshot } from './agentic-wallet-funding-conversion-accounting-snapshot.reader';
import { FundingConversionFinancialEvidenceContext } from './agentic-wallet-funding-conversion-financial-evidence-context.store';
import { StoredFundingConversionFinancialReconciliation } from './agentic-wallet-funding-conversion-financial-reconciliation.store';
import { BSC_NATIVE_BNB_ADDRESS } from '../infrastructure/agentic-wallet-funding-conversion-quote.adapter';

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

describe('AgenticWalletFundingConversionAccountingSyncService', () => {
  it('returns an existing synchronization before durable or provider reads', async () => {
    const harness = createHarness({ existing: applied() });

    await expect(harness.service.synchronize(command())).resolves.toMatchObject(
      {
        status: 'accounting_already_synchronized',
        synchronization: applied(),
        replayed: true,
        providerReadStarted: false,
        accountingSynchronizationComplete: true,
        strategyExecutionAuthorized: false,
      },
    );
    expect(harness.getReconciliation).not.toHaveBeenCalled();
    expect(harness.loadSnapshot).not.toHaveBeenCalled();
  });

  it('blocks when financial reconciliation is absent', async () => {
    const harness = createHarness({ reconciliation: null });
    await expect(harness.service.synchronize(command())).resolves.toMatchObject(
      {
        status: 'blocked',
        blockers: ['financial_reconciliation_absent'],
        providerReadStarted: false,
      },
    );
    expect(harness.loadSnapshot).not.toHaveBeenCalled();
  });

  it('reads one exact snapshot and delegates one atomic application', async () => {
    const harness = createHarness();
    await expect(harness.service.synchronize(command())).resolves.toMatchObject(
      {
        status: 'accounting_synchronized',
        synchronization: applied(),
        providerReadStarted: true,
        providerReadCompleted: true,
        accountingSynchronizationComplete: true,
        strategyExecutionAuthorized: false,
        automaticRetryAllowed: false,
      },
    );
    expect(harness.loadSnapshot).toHaveBeenCalledWith(WALLET, undefined);
    expect(harness.apply).toHaveBeenCalledWith({
      id: SYNC_ID,
      initializationId: INITIALIZATION_ID,
      reconciliation: reconciliation(),
      context: context(),
      snapshot: snapshot(),
      acknowledgment: FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT,
      preparedAt: PREPARED_AT,
    });
  });

  it('blocks an absent accounting initialization before provider access', async () => {
    const harness = createHarness({ initializationPresent: false });

    await expect(harness.service.synchronize(command())).resolves.toMatchObject(
      {
        status: 'blocked',
        blockers: ['accounting_initialization_absent'],
        providerReadStarted: false,
      },
    );
    expect(harness.getInitialization).toHaveBeenCalledWith(INITIALIZATION_ID);
    expect(harness.loadSnapshot).not.toHaveBeenCalled();
    expect(harness.apply).not.toHaveBeenCalled();
  });

  it('rejects malformed input before dependency access', async () => {
    const harness = createHarness();
    await expect(
      harness.service.synchronize({
        ...command(),
        acknowledgment: 'bad' as never,
      }),
    ).rejects.toBeInstanceOf(FundingConversionAccountingSyncRequestError);
    expect(harness.getExisting).not.toHaveBeenCalled();
  });

  it('suppresses overlapping work for one attempt', async () => {
    let release!: (value: FundingConversionAccountingSnapshot) => void;
    const pending = new Promise<FundingConversionAccountingSnapshot>(
      (resolve) => (release = resolve),
    );
    const harness = createHarness({ loadedSnapshot: pending });
    const first = harness.service.synchronize(command());
    await Promise.resolve();
    await Promise.resolve();
    await expect(harness.service.synchronize(command())).resolves.toMatchObject(
      {
        status: 'blocked',
        blockers: ['accounting_synchronization_in_progress'],
      },
    );
    release(snapshot());
    await expect(first).resolves.toMatchObject({
      status: 'accounting_synchronized',
    });
  });
});

function createHarness(options?: {
  existing?: AppliedFundingConversionAccountingSync | null;
  reconciliation?: StoredFundingConversionFinancialReconciliation | null;
  loadedSnapshot?: Promise<FundingConversionAccountingSnapshot>;
  initializationPresent?: boolean;
}) {
  const getExisting = jest.fn(() => Promise.resolve(options?.existing ?? null));
  const getReconciliation = jest.fn(() =>
    Promise.resolve(
      options !== undefined && 'reconciliation' in options
        ? (options.reconciliation ?? null)
        : reconciliation(),
    ),
  );
  const getContext = jest.fn(() => Promise.resolve(context()));
  const loadSnapshot = jest.fn(
    () => options?.loadedSnapshot ?? Promise.resolve(snapshot()),
  );
  const getInitialization = jest.fn(() =>
    Promise.resolve(
      options?.initializationPresent === false ? null : ({} as never),
    ),
  );
  const apply = jest.fn(() =>
    Promise.resolve({ synchronized: applied(), replayed: false }),
  );
  return {
    getExisting,
    getReconciliation,
    getContext,
    getInitialization,
    loadSnapshot,
    apply,
    service: new AgenticWalletFundingConversionAccountingSyncService(
      { getByAttemptId: getExisting, apply },
      { getByAttemptId: getReconciliation },
      { getByAttemptId: getContext },
      { load: loadSnapshot },
      { getByInitializationId: getInitialization },
      () => PREPARED_AT,
      () => SYNC_ID,
    ),
  };
}

function command() {
  return {
    attemptId: ATTEMPT_ID,
    initializationId: INITIALIZATION_ID,
    acknowledgment: FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT,
  };
}

function reconciliation(): StoredFundingConversionFinancialReconciliation {
  return {
    id: RECONCILIATION_ID,
    attemptId: ATTEMPT_ID,
    planId: PLAN_ID,
    expectedUsdt: '5.95',
    minimumUsdt: '5.92',
    outputAssessment: 'minimum_satisfied_below_expected',
    evidence: {
      scope:
        'agentic_wallet_funding_conversion_financial_reconciliation_evidence',
      attemptId: ATTEMPT_ID,
      providerOrderId: 'order_123',
      statusObservationId: STATUS_ID,
      transactionHash: HASH,
      chainId: '56',
      sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(),
      targetTokenAddress:
        APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT.usdt.tokenAddress,
      submittedSourceQuantityBnb: '0.008',
      actualUsdtReceived: '5.93',
      providerFeeComponents: [],
      networkFeeAsset: 'BNB',
      networkFeeQuantityBnb: '0.00002',
      transactionReceiptObserved: true,
      sourceBalanceDeltaObserved: true,
      targetBalanceDeltaObserved: true,
      providerFeeCoverageComplete: true,
      networkFeeCoverageComplete: true,
      observedAt: new Date('2026-10-24T13:59:00.000Z'),
    },
    recordedAt: new Date('2026-10-24T13:59:01.000Z'),
    financialReconciliationComplete: true,
    automaticRetryAllowed: false,
  };
}

function context(): FundingConversionFinancialEvidenceContext {
  return {
    reconciliation: {
      scope:
        'agentic_wallet_funding_conversion_financial_reconciliation_context',
      attemptId: ATTEMPT_ID,
      planId: PLAN_ID,
      providerOrderId: 'order_123',
      sourceQuantityBnb: '0.008',
      expectedUsdt: '5.95',
      minimumUsdt: '5.92',
      statusObservation: {
        id: STATUS_ID,
        observation: {
          attemptId: ATTEMPT_ID,
          providerOrderId: 'order_123',
          providerStatus: 'FINISHED',
          transactionHash: HASH,
          bookedAt: new Date('2026-10-24T13:50:00.000Z'),
          providerUpdatedAt: new Date('2026-10-24T13:55:00.000Z'),
          terminal: true,
          executionSucceeded: true,
          financialReconciliationRequired: true,
          financialReconciliationComplete: false,
          automaticRetryAllowed: false,
        },
        recordedAt: new Date('2026-10-24T13:55:01.000Z'),
      },
    },
    walletAddress: WALLET,
    preBalanceBlockNumber: '0x10',
    preBnbBalance: '1',
    preUsdtBalance: '0',
    preBalanceObservedAt: new Date('2026-10-24T13:49:00.000Z'),
    providerFeeRate: '0',
    providerFeeUsd: '0',
    feeEvidenceObservedAt: new Date('2026-10-24T13:49:30.000Z'),
  };
}

function snapshot(): FundingConversionAccountingSnapshot {
  const instrument = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  return {
    scope: 'agentic_wallet_funding_conversion_accounting_snapshot',
    chainId: '56',
    walletAddress: WALLET,
    blockNumber: '0x20',
    balances: [
      {
        assetIdentity: 'native:BNB',
        assetType: 'native',
        assetAddress: null,
        assetSymbol: 'BNB',
        quantity: '0.99198',
      },
      {
        assetIdentity: `token:${instrument.usdt.tokenAddress}`,
        assetType: 'token',
        assetAddress: instrument.usdt.tokenAddress,
        assetSymbol: null,
        quantity: '5.93',
      },
      {
        assetIdentity: `token:${instrument.btc.tokenAddress}`,
        assetType: 'token',
        assetAddress: instrument.btc.tokenAddress,
        assetSymbol: null,
        quantity: '0',
      },
    ],
    observedAt: OBSERVED_AT,
  };
}

function applied(): AppliedFundingConversionAccountingSync {
  return {
    scope: 'applied_funding_conversion_accounting_sync',
    id: SYNC_ID,
    initializationId: INITIALIZATION_ID,
    reconciliationId: RECONCILIATION_ID,
    attemptId: ATTEMPT_ID,
    transactionHash: HASH,
    walletAddress: WALLET,
    blockNumber: '0x20',
    acknowledgment: FUNDING_CONVERSION_ACCOUNTING_SYNC_ACKNOWLEDGMENT,
    balances: [],
    observedAt: OBSERVED_AT,
    preparedAt: PREPARED_AT,
    appliedAt: PREPARED_AT,
    financialReconciliationComplete: true,
    accountingSynchronizationComplete: true,
    automaticRetryAllowed: false,
  };
}
