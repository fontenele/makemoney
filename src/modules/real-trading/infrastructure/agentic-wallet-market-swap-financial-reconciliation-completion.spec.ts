import {
  AgenticWalletMarketSwapFinancialReconciliationCompletionAssessment,
  assessAgenticWalletMarketSwapFinancialReconciliationCompletion,
} from './agentic-wallet-market-swap-financial-reconciliation-completion';
import { AgenticWalletMarketSwapFinancialReconciliationEvidence } from './agentic-wallet-market-swap-financial-reconciliation-evidence';
import { StoredAgenticWalletMarketSwapFinancialReconciliationEvidence } from './agentic-wallet-market-swap-financial-reconciliation-evidence.store';

const EVIDENCE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OBSERVATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const OBSERVED_AT = new Date('2026-10-03T12:00:07.000Z');
const RECORDED_AT = new Date('2026-10-03T12:00:08.000Z');

describe('assessAgenticWalletMarketSwapFinancialReconciliationCompletion', () => {
  it('projects durable complete evidence into an accounting-ready reconciliation snapshot', () => {
    const assessment =
      assessAgenticWalletMarketSwapFinancialReconciliationCompletion(stored());

    expect(assessment).toEqual({
      scope:
        'agentic_wallet_market_swap_financial_reconciliation_completion_assessment',
      status: 'financial_reconciliation_complete',
      blockers: [],
      completion: {
        scope: 'agentic_wallet_market_swap_financial_reconciliation_completion',
        evidenceId: EVIDENCE_ID,
        providerId: 'agentic_wallet',
        chainId: '56',
        gateId: GATE_ID,
        providerOrderId: '1234567890',
        statusObservationId: OBSERVATION_ID,
        transactionHash: TRANSACTION_HASH,
        sourceTokenAddress: USDT,
        targetTokenAddress: BTCB,
        submittedSourceQuantity: '5',
        actualReceivedQuantity: '0.000071',
        providerFeeComponents: [{ assetAddress: USDT, quantity: '0.005' }],
        networkFeeAsset: 'BNB',
        networkFeeQuantity: '0.0003',
        evidenceObservedAt: OBSERVED_AT,
        evidenceRecordedAt: RECORDED_AT,
        financialReconciliationRequired: true,
        financialReconciliationComplete: true,
        accountingMutationRequired: true,
        accountingMutationComplete: false,
        submissionRetryAllowed: false,
      },
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    });
  });

  it('defensively copies mutable arrays, entries, and timestamps', () => {
    const input = stored();
    const assessment =
      assessAgenticWalletMarketSwapFinancialReconciliationCompletion(input);
    const completion = requireCompletion(assessment);

    expect(completion.providerFeeComponents).not.toBe(
      input.evidence.providerFeeComponents,
    );
    expect(completion.providerFeeComponents[0]).not.toBe(
      input.evidence.providerFeeComponents[0],
    );
    expect(completion.evidenceObservedAt).not.toBe(input.evidence.observedAt);
    expect(completion.evidenceRecordedAt).not.toBe(input.recordedAt);
  });

  it.each([
    { id: 'not-a-uuid' },
    { recordedAt: new Date(Number.NaN) },
    { recordedAt: new Date('2026-10-03T12:00:06.999Z') },
  ])('blocks invalid durable envelope %#', (override) => {
    expect(
      assessAgenticWalletMarketSwapFinancialReconciliationCompletion(
        stored(override),
      ),
    ).toEqual(blocked());
  });

  it.each([
    { actualTargetReceivedQuantity: '0' },
    { networkFeeQuantity: '0' },
    { providerFeeCoverageComplete: false as true },
    { transactionReceiptObserved: false as true },
  ])('blocks malformed or incomplete persisted evidence %#', (override) => {
    expect(
      assessAgenticWalletMarketSwapFinancialReconciliationCompletion(
        stored({ evidence: evidence(override) }),
      ),
    ).toEqual(blocked());
  });

  it('never treats reconciliation completion as completed accounting or retry authority', () => {
    const assessment =
      assessAgenticWalletMarketSwapFinancialReconciliationCompletion(stored());
    const completion = requireCompletion(assessment);

    expect(completion.financialReconciliationComplete).toBe(true);
    expect(completion.accountingMutationRequired).toBe(true);
    expect(completion.accountingMutationComplete).toBe(false);
    expect(completion.submissionRetryAllowed).toBe(false);
  });
});

function stored(
  overrides: Partial<StoredAgenticWalletMarketSwapFinancialReconciliationEvidence> = {},
): StoredAgenticWalletMarketSwapFinancialReconciliationEvidence {
  return {
    id: EVIDENCE_ID,
    evidence: evidence(),
    recordedAt: RECORDED_AT,
    ...overrides,
  };
}

function evidence(
  overrides: Partial<AgenticWalletMarketSwapFinancialReconciliationEvidence> = {},
): AgenticWalletMarketSwapFinancialReconciliationEvidence {
  return {
    scope: 'agentic_wallet_market_swap_financial_reconciliation_evidence',
    providerId: 'agentic_wallet',
    chainId: '56',
    gateId: GATE_ID,
    providerOrderId: '1234567890',
    statusObservationId: OBSERVATION_ID,
    transactionHash: TRANSACTION_HASH,
    sourceTokenAddress: USDT,
    targetTokenAddress: BTCB,
    submittedSourceQuantity: '5',
    actualTargetReceivedQuantity: '0.000071',
    providerFeeComponents: [{ assetAddress: USDT, quantity: '0.005' }],
    networkFeeAsset: 'BNB',
    networkFeeQuantity: '0.0003',
    transactionReceiptObserved: true,
    targetBalanceDeltaObserved: true,
    providerFeeCoverageComplete: true,
    networkFeeCoverageComplete: true,
    observedAt: OBSERVED_AT,
    ...overrides,
  };
}

function blocked(): AgenticWalletMarketSwapFinancialReconciliationCompletionAssessment {
  return {
    scope:
      'agentic_wallet_market_swap_financial_reconciliation_completion_assessment',
    status: 'blocked',
    blockers: ['invalid_stored_financial_evidence'],
    completion: null,
    financialReconciliationComplete: false,
    accountingMutationRequired: false,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
  };
}

function requireCompletion(
  assessment: AgenticWalletMarketSwapFinancialReconciliationCompletionAssessment,
) {
  if (assessment.completion === null)
    throw new Error('expected financial reconciliation completion');
  return assessment.completion;
}
