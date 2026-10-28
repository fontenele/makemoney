import { jest } from '@jest/globals';

import { AgenticWalletFundingConversionAccountingAbsenceReader } from './agentic-wallet-funding-conversion-accounting-absence.reader';
import {
  FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT,
  FundingConversionAccountingAbsenceEvidence,
} from './agentic-wallet-funding-conversion-accounting-bootstrap';
import {
  AgenticWalletFundingConversionAccountingBootstrapService,
  FundingConversionAccountingBootstrapCanceledError,
  FundingConversionAccountingBootstrapRequestError,
} from './agentic-wallet-funding-conversion-accounting-bootstrap.service';
import {
  AgenticWalletFundingConversionAccountingBootstrapStore,
  FundingConversionAccountingBootstrapStoreRequest,
} from './agentic-wallet-funding-conversion-accounting-bootstrap.store';
import {
  AgenticWalletFundingConversionAccountingSnapshotReader,
  FundingConversionAccountingSnapshot,
} from './agentic-wallet-funding-conversion-accounting-snapshot.reader';
import { AgenticWalletFundingConversionFinancialEvidenceContextStore } from './agentic-wallet-funding-conversion-financial-evidence-context.store';
import {
  AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore,
  StoredFundingConversionFinancialReconciliation,
} from './agentic-wallet-funding-conversion-financial-reconciliation.store';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import { BSC_NATIVE_BNB_ADDRESS } from '../infrastructure/agentic-wallet-funding-conversion-quote.adapter';

const ATTEMPT_ID = '019a0db1-bfea-7000-8000-000000000002';
const PLAN_ID = '019a0db1-bfea-7000-8000-000000000001';
const STATUS_ID = '019a0db1-bfea-7000-8000-000000000003';
const RECONCILIATION_ID = '019a0db1-bfea-7000-8000-000000000004';
const BOOTSTRAP_ID = '019a0db1-bfea-7000-8000-000000000005';
const HASH = `0x${'a'.repeat(64)}`;
const WALLET = '0x1111111111111111111111111111111111111111';
const PREPARED_AT = new Date('2026-10-27T14:00:01.000Z');

describe('AgenticWalletFundingConversionAccountingBootstrapService', () => {
  it('inspects empty state, reads one finalized snapshot, and applies the plan', async () => {
    const harness = createHarness();

    await expect(harness.service.bootstrapOnce(command())).resolves.toEqual(
      expect.objectContaining({
        status: 'accounting_bootstrapped',
        blockers: [],
        replayed: false,
        accountingStateInspected: true,
        providerReadStarted: true,
        providerReadCompleted: true,
        accountingBootstrapComplete: true,
        ordinaryAccountingSynchronizationApplied: false,
        historicalLedgerContinuityClaimed: false,
        historicalBtcbContinuityClaimed: false,
        strategyExecutionAuthorized: false,
        automaticRetryAllowed: false,
      }),
    );
    expect(harness.load).toHaveBeenCalledWith(WALLET, undefined);
    expect(harness.apply).toHaveBeenCalledTimes(1);
    expect(harness.apply.mock.calls[0][0]).toMatchObject({
      bootstrap: {
        bootstrapId: BOOTSTRAP_ID,
        acknowledgment: FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT,
        maximumSnapshotAgeMs: 60_000,
      },
    });
  });

  it('blocks missing durable prerequisites before inspection or provider access', async () => {
    const absentReconciliation = createHarness({ reconciliation: null });
    await expect(
      absentReconciliation.service.bootstrapOnce(command()),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['financial_reconciliation_absent'],
      accountingStateInspected: false,
      providerReadStarted: false,
    });
    expect(absentReconciliation.inspect).not.toHaveBeenCalled();

    const absentContext = createHarness({ context: null });
    await expect(
      absentContext.service.bootstrapOnce(command()),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['terminal_conversion_context_absent'],
      providerReadStarted: false,
    });
    expect(absentContext.inspect).not.toHaveBeenCalled();
  });

  it('blocks nonempty accounting state before provider access', async () => {
    const harness = createHarness({
      absence: { ...absence(), balanceCount: 1 },
    });

    await expect(
      harness.service.bootstrapOnce(command()),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['accounting_state_not_empty'],
      accountingStateInspected: true,
      providerReadStarted: false,
    });
    expect(harness.load).not.toHaveBeenCalled();
    expect(harness.apply).not.toHaveBeenCalled();
  });

  it('withholds an invalid current snapshot from the atomic store', async () => {
    const harness = createHarness({
      snapshot: { ...snapshot(), blockNumber: '0x10' },
    });

    const result = await harness.service.bootstrapOnce(command());
    expect(result).toMatchObject({
      status: 'blocked',
      providerReadStarted: true,
      providerReadCompleted: true,
    });
    expect(result.blockers).toContain(
      'wallet_snapshot_not_after_preconversion',
    );
    expect(harness.apply).not.toHaveBeenCalled();
  });

  it('suppresses overlapping work for the same explicit action', async () => {
    let release!: (value: FundingConversionAccountingSnapshot) => void;
    const pending = new Promise<FundingConversionAccountingSnapshot>(
      (resolve) => {
        release = resolve;
      },
    );
    const harness = createHarness({ snapshot: pending });
    const first = harness.service.bootstrapOnce(command());
    await Promise.resolve();
    await Promise.resolve();

    await expect(
      harness.service.bootstrapOnce(command()),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['accounting_bootstrap_in_progress'],
      providerReadStarted: false,
    });
    release(snapshot());
    await expect(first).resolves.toMatchObject({
      status: 'accounting_bootstrapped',
    });
    expect(harness.load).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid or canceled commands before dependency access', async () => {
    const harness = createHarness();
    await expect(
      harness.service.bootstrapOnce({
        attemptId: 'invalid',
        acknowledgment: FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT,
      }),
    ).rejects.toBeInstanceOf(FundingConversionAccountingBootstrapRequestError);
    await expect(
      harness.service.bootstrapOnce({
        ...command(),
        acknowledgment:
          'invalid' as typeof FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT,
      }),
    ).rejects.toBeInstanceOf(FundingConversionAccountingBootstrapRequestError);

    const controller = new AbortController();
    controller.abort();
    await expect(
      harness.service.bootstrapOnce(command(), controller.signal),
    ).rejects.toBeInstanceOf(FundingConversionAccountingBootstrapCanceledError);
    expect(harness.getReconciliation).not.toHaveBeenCalled();
  });

  it('propagates dependency failure and releases the one-shot guard', async () => {
    const harness = createHarness();
    harness.apply.mockRejectedValueOnce(new Error('store failed'));

    await expect(harness.service.bootstrapOnce(command())).rejects.toThrow(
      'store failed',
    );
    await expect(
      harness.service.bootstrapOnce(command()),
    ).resolves.toMatchObject({ status: 'accounting_bootstrapped' });
  });
});

function command() {
  return {
    attemptId: ATTEMPT_ID,
    acknowledgment: FUNDING_CONVERSION_ACCOUNTING_BOOTSTRAP_ACKNOWLEDGMENT,
  };
}

function createHarness(options?: {
  reconciliation?: StoredFundingConversionFinancialReconciliation | null;
  context?: ReturnType<typeof context> | null;
  absence?: FundingConversionAccountingAbsenceEvidence;
  snapshot?:
    | FundingConversionAccountingSnapshot
    | Promise<FundingConversionAccountingSnapshot>;
}) {
  const getReconciliation = jest
    .fn<() => Promise<StoredFundingConversionFinancialReconciliation | null>>()
    .mockResolvedValue(
      options !== undefined && 'reconciliation' in options
        ? (options.reconciliation ?? null)
        : reconciliation(),
    );
  const getContext = jest
    .fn<() => Promise<ReturnType<typeof context> | null>>()
    .mockResolvedValue(
      options !== undefined && 'context' in options
        ? (options.context ?? null)
        : context(),
    );
  const inspect = jest
    .fn<() => Promise<FundingConversionAccountingAbsenceEvidence>>()
    .mockResolvedValue(options?.absence ?? absence());
  const load = jest
    .fn<() => Promise<FundingConversionAccountingSnapshot>>()
    .mockImplementation(async () => await (options?.snapshot ?? snapshot()));
  const apply = jest
    .fn<
      (request: FundingConversionAccountingBootstrapStoreRequest) => Promise<{
        applied: ReturnType<typeof appliedFrom>;
        replayed: boolean;
      }>
    >()
    .mockImplementation((request) =>
      Promise.resolve({
        applied: appliedFrom(request),
        replayed: false,
      }),
    );
  return {
    getReconciliation,
    getContext,
    inspect,
    load,
    apply,
    service: new AgenticWalletFundingConversionAccountingBootstrapService(
      {
        getByAttemptId: getReconciliation,
      } satisfies AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore,
      {
        getByAttemptId: getContext,
      } satisfies AgenticWalletFundingConversionFinancialEvidenceContextStore,
      {
        inspect,
      } satisfies AgenticWalletFundingConversionAccountingAbsenceReader,
      { load } satisfies AgenticWalletFundingConversionAccountingSnapshotReader,
      {
        apply,
      } satisfies AgenticWalletFundingConversionAccountingBootstrapStore,
      () => new Date(PREPARED_AT),
      () => BOOTSTRAP_ID,
    ),
  };
}

function appliedFrom(
  request: FundingConversionAccountingBootstrapStoreRequest,
) {
  return {
    scope: 'applied_funding_conversion_accounting_bootstrap' as const,
    bootstrap: request.bootstrap,
    initializationId: request.bootstrap.bootstrapId,
    appliedAt: new Date('2026-10-27T14:00:02.000Z'),
    accountingBalancesInitialized: true as const,
    accountingBootstrapComplete: true as const,
    ordinaryAccountingSynchronizationApplied: false as const,
    historicalLedgerContinuityClaimed: false as const,
    historicalBtcbContinuityClaimed: false as const,
    strategyExecutionAuthorized: false as const,
    automaticRetryAllowed: false as const,
  };
}

function absence(): FundingConversionAccountingAbsenceEvidence {
  return {
    scope: 'funding_conversion_accounting_absence_evidence',
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

function context() {
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
    observedAt: new Date('2026-10-27T14:00:00.000Z'),
  };
}
