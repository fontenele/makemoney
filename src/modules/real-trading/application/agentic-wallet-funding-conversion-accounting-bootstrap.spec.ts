import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import {
  FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT,
  prepareFundingConversionAccountingBootstrap,
} from './agentic-wallet-funding-conversion-accounting-bootstrap';
import type { FundingConversionAccountingSnapshot } from './agentic-wallet-funding-conversion-accounting-snapshot.reader';
import type { FundingConversionFinancialEvidenceContext } from './agentic-wallet-funding-conversion-financial-evidence-context.store';
import type { StoredFundingConversionFinancialReconciliation } from './agentic-wallet-funding-conversion-financial-reconciliation.store';
import { BSC_NATIVE_BNB_ADDRESS } from '../infrastructure/agentic-wallet-funding-conversion-quote.adapter';

const ATTEMPT_ID = '019a0db1-bfea-7000-8000-000000000002';
const PLAN_ID = '019a0db1-bfea-7000-8000-000000000001';
const STATUS_ID = '019a0db1-bfea-7000-8000-000000000003';
const RECONCILIATION_ID = '019a0db1-bfea-7000-8000-000000000004';
const BOOTSTRAP_ID = '019a0db1-bfea-7000-8000-000000000005';
const HASH = `0x${'a'.repeat(64)}`;
const WALLET = '0x1111111111111111111111111111111111111111';
const SNAPSHOT_AT = new Date('2026-10-27T14:00:00.000Z');
const PREPARED_AT = new Date('2026-10-27T14:00:01.000Z');

describe('prepareFundingConversionAccountingBootstrap', () => {
  it('prepares a truthful post-conversion baseline without claiming history', () => {
    const result = prepareFundingConversionAccountingBootstrap(
      reconciliation(),
      context(),
      snapshot(),
      absence(),
      request(),
    );

    expect(result).toMatchObject({
      scope:
        'agentic_wallet_funding_conversion_accounting_bootstrap_assessment',
      status: 'accounting_bootstrap_ready',
      blockers: [],
      historicalLedgerContinuityClaimed: false,
      historicalBtcbContinuityClaimed: false,
      accountingBalancesInitialized: false,
      accountingSynchronizationComplete: false,
      strategyExecutionAuthorized: false,
      automaticRetryAllowed: false,
    });
    expect(result.bootstrap).toMatchObject({
      bootstrapId: BOOTSTRAP_ID,
      reconciliationId: RECONCILIATION_ID,
      attemptId: ATTEMPT_ID,
      reason: 'post_reconciliation_missing_preexisting_ledger',
      financialReconciliationComplete: true,
      postConversionStateVerified: true,
      historicalLedgerContinuityClaimed: false,
      historicalBtcbContinuityClaimed: false,
      accountingBalancesInitialized: false,
      accountingSynchronizationComplete: false,
      strategyExecutionAuthorized: false,
    });
    expect(result.bootstrap?.balances).toEqual([
      expect.objectContaining({
        assetIdentity: 'native:BNB',
        currentQuantity: '0.595',
      }),
      expect.objectContaining({
        assetIdentity: `token:${APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT.usdt.tokenAddress}`,
        currentQuantity: '5.93',
      }),
      expect.objectContaining({
        assetIdentity: `token:${APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT.btc.tokenAddress}`,
        currentQuantity: '0',
      }),
    ]);
  });

  it('blocks when any local accounting state already exists', () => {
    const result = prepareFundingConversionAccountingBootstrap(
      reconciliation(),
      context(),
      snapshot(),
      { ...absence(), balanceCount: 1 },
      request(),
    );

    expect(result.status).toBe('blocked');
    expect(result.blockers).toEqual(['accounting_state_not_empty']);
    expect(result.bootstrap).toBeNull();
  });

  it('blocks a snapshot that does not satisfy the reconciled equations', () => {
    const changed = snapshot();
    const result = prepareFundingConversionAccountingBootstrap(
      reconciliation(),
      context(),
      {
        ...changed,
        balances: changed.balances.map((balance) =>
          balance.assetIdentity === 'native:BNB'
            ? { ...balance, quantity: '0.596' }
            : balance,
        ),
      },
      absence(),
      request(),
    );

    expect(result.blockers).toEqual([
      'post_conversion_balance_equation_mismatch',
    ]);
    expect(result.bootstrap).toBeNull();
  });

  it('blocks stale current evidence and a missing acknowledgment', () => {
    const result = prepareFundingConversionAccountingBootstrap(
      reconciliation(),
      context(),
      snapshot(),
      absence(),
      {
        ...request(),
        acknowledgment: 'bad' as never,
        maximumSnapshotAgeMs: 500,
      },
    );

    expect(result.blockers).toEqual([
      'bootstrap_acknowledgment_missing',
      'wallet_snapshot_stale',
    ]);
    expect(result.bootstrap).toBeNull();
  });

  it('blocks mismatched durable conversion identity', () => {
    const result = prepareFundingConversionAccountingBootstrap(
      reconciliation(),
      {
        ...context(),
        walletAddress: '0x2222222222222222222222222222222222222222',
      },
      snapshot(),
      absence(),
      request(),
    );

    expect(result.blockers).toContain('conversion_identity_mismatch');
    expect(result.bootstrap).toBeNull();
  });
});

function request() {
  return {
    bootstrapId: BOOTSTRAP_ID,
    acknowledgment: FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT,
    maximumSnapshotAgeMs: 60_000,
    preparedAt: PREPARED_AT,
  };
}

function absence() {
  return {
    scope: 'funding_conversion_accounting_absence_evidence' as const,
    initializationCount: 0,
    balanceCount: 0,
    synchronizationCount: 0,
    inspectedAt: new Date('2026-10-27T14:00:00.500Z'),
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
      submittedSourceQuantityBnb: '0.4',
      actualUsdtReceived: '5.93',
      providerFeeComponents: [],
      networkFeeAsset: 'BNB',
      networkFeeQuantityBnb: '0.005',
      transactionReceiptObserved: true,
      sourceBalanceDeltaObserved: true,
      targetBalanceDeltaObserved: true,
      providerFeeCoverageComplete: true,
      networkFeeCoverageComplete: true,
      observedAt: new Date('2026-10-27T13:59:00.000Z'),
    },
    recordedAt: new Date('2026-10-27T13:59:01.000Z'),
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
          terminal: true,
          executionSucceeded: true,
          financialReconciliationRequired: true,
          financialReconciliationComplete: false,
          automaticRetryAllowed: false,
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
        quantity: '0.595',
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
    observedAt: SNAPSHOT_AT,
  };
}
