import { jest } from '@jest/globals';

import { AgenticWalletFundingConversionAccountingAbsenceReader } from './agentic-wallet-funding-conversion-accounting-absence.reader';
import type { FundingConversionAccountingAbsenceEvidence } from './agentic-wallet-funding-conversion-accounting-bootstrap';
import {
  AgenticWalletFundingConversionAccountingBootstrapReadinessService,
  FundingConversionAccountingBootstrapReadinessRequestError,
} from './agentic-wallet-funding-conversion-accounting-bootstrap-readiness.service';
import {
  AgenticWalletFundingConversionFinancialEvidenceContextStore,
  FundingConversionFinancialEvidenceContext,
} from './agentic-wallet-funding-conversion-financial-evidence-context.store';
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
const HASH = `0x${'a'.repeat(64)}`;

describe('AgenticWalletFundingConversionAccountingBootstrapReadinessService', () => {
  it('reports durable empty state ready for a separate explicit action', async () => {
    const harness = createHarness();

    await expect(harness.service.assess(ATTEMPT_ID)).resolves.toEqual({
      scope: 'agentic_wallet_funding_conversion_accounting_bootstrap_readiness',
      status: 'ready_for_explicit_bootstrap_action',
      blockers: [],
      attemptId: ATTEMPT_ID,
      reconciliationId: RECONCILIATION_ID,
      accountingState: absence(),
      financialReconciliationComplete: true,
      terminalConversionContextComplete: true,
      accountingStateInspected: true,
      accountingStateEmpty: true,
      providerReadStarted: false,
      bootstrapInvoked: false,
      explicitOperatorActionRequired: true,
      accountingBalancesInitialized: false,
      strategyExecutionAuthorized: false,
      automaticRetryAllowed: false,
    });
    expect(harness.inspect).toHaveBeenCalledTimes(1);
  });

  it('stops missing durable prerequisites before accounting inspection', async () => {
    const missingReconciliation = createHarness({ reconciliation: null });
    await expect(
      missingReconciliation.service.assess(ATTEMPT_ID),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['financial_reconciliation_absent'],
      accountingStateInspected: false,
    });
    expect(missingReconciliation.getContext).not.toHaveBeenCalled();
    expect(missingReconciliation.inspect).not.toHaveBeenCalled();

    const missingContext = createHarness({ context: null });
    await expect(
      missingContext.service.assess(ATTEMPT_ID),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['terminal_conversion_context_absent'],
      financialReconciliationComplete: true,
      accountingStateInspected: false,
    });
    expect(missingContext.inspect).not.toHaveBeenCalled();
  });

  it('blocks divergent durable context before accounting inspection', async () => {
    const durableContext = context();
    const harness = createHarness({
      context: {
        ...durableContext,
        reconciliation: {
          ...durableContext.reconciliation,
          expectedUsdt: '6',
        },
      },
    });

    await expect(harness.service.assess(ATTEMPT_ID)).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['durable_conversion_context_mismatch'],
      terminalConversionContextComplete: true,
      accountingStateInspected: false,
    });
    expect(harness.inspect).not.toHaveBeenCalled();
  });

  it('reports nonempty accounting state without invoking a bootstrap', async () => {
    const harness = createHarness({
      absence: { ...absence(), initializationCount: 1 },
    });

    await expect(harness.service.assess(ATTEMPT_ID)).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['accounting_state_not_empty'],
      accountingStateInspected: true,
      accountingStateEmpty: false,
      providerReadStarted: false,
      bootstrapInvoked: false,
    });
  });

  it('rejects malformed identity before dependency access', async () => {
    const harness = createHarness();

    await expect(harness.service.assess('invalid')).rejects.toBeInstanceOf(
      FundingConversionAccountingBootstrapReadinessRequestError,
    );
    expect(harness.getReconciliation).not.toHaveBeenCalled();
  });
});

function createHarness(options?: {
  reconciliation?: StoredFundingConversionFinancialReconciliation | null;
  context?: FundingConversionFinancialEvidenceContext | null;
  absence?: FundingConversionAccountingAbsenceEvidence;
}) {
  const getReconciliation = jest
    .fn<() => Promise<StoredFundingConversionFinancialReconciliation | null>>()
    .mockResolvedValue(
      options !== undefined && 'reconciliation' in options
        ? (options.reconciliation ?? null)
        : reconciliation(),
    );
  const getContext = jest
    .fn<() => Promise<FundingConversionFinancialEvidenceContext | null>>()
    .mockResolvedValue(
      options !== undefined && 'context' in options
        ? (options.context ?? null)
        : context(),
    );
  const inspect = jest
    .fn<() => Promise<FundingConversionAccountingAbsenceEvidence>>()
    .mockResolvedValue(options?.absence ?? absence());
  return {
    getReconciliation,
    getContext,
    inspect,
    service:
      new AgenticWalletFundingConversionAccountingBootstrapReadinessService(
        {
          getByAttemptId: getReconciliation,
        } satisfies AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore,
        {
          getByAttemptId: getContext,
        } satisfies AgenticWalletFundingConversionFinancialEvidenceContextStore,
        {
          inspect,
        } satisfies AgenticWalletFundingConversionAccountingAbsenceReader,
      ),
  };
}

function absence(): FundingConversionAccountingAbsenceEvidence {
  return {
    scope: 'funding_conversion_accounting_absence_evidence',
    initializationCount: 0,
    balanceCount: 0,
    synchronizationCount: 0,
    inspectedAt: new Date('2026-10-27T14:00:00.000Z'),
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
    walletAddress: '0x1111111111111111111111111111111111111111',
    preBalanceBlockNumber: '0x10',
    preBnbBalance: '1',
    preUsdtBalance: '0',
    preBalanceObservedAt: new Date('2026-10-27T13:49:00.000Z'),
    providerFeeRate: '0',
    providerFeeUsd: '0',
    feeEvidenceObservedAt: new Date('2026-10-27T13:49:30.000Z'),
  };
}
