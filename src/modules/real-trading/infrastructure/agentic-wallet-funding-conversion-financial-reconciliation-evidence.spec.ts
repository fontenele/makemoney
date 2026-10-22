import type { StoredFundingConversionStatusObservation } from '../application/agentic-wallet-funding-conversion-status-observation.store';
import {
  FundingConversionFinancialReconciliationContext,
  FundingConversionFinancialReconciliationEvidence,
  assessFundingConversionFinancialReconciliationEvidence,
  isValidFundingConversionFinancialReconciliationEvidence,
} from './agentic-wallet-funding-conversion-financial-reconciliation-evidence';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';

const ATTEMPT_ID = '019a0db1-bfea-7000-8000-000000000002';
const PLAN_ID = '019a0db1-bfea-7000-8000-000000000001';
const OBSERVATION_ID = '019a0db1-bfea-7000-8000-000000000003';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;

describe('assessFundingConversionFinancialReconciliationEvidence', () => {
  it('returns a defensive persistence-ready snapshot for complete evidence', () => {
    const input = evidence();
    const assessment = assessFundingConversionFinancialReconciliationEvidence(
      context(),
      input,
    );

    expect(assessment).toEqual({
      scope:
        'agentic_wallet_funding_conversion_financial_reconciliation_evidence_assessment',
      status: 'evidence_ready_for_persistence',
      blockers: [],
      evidence: input,
      actualUsdtReceived: '5.93',
      outputAssessment: 'minimum_satisfied_below_expected',
      persistenceRequired: true,
      financialReconciliationRequired: true,
      financialReconciliationComplete: false,
      automaticRetryAllowed: false,
    });
    expect(assessment.evidence).not.toBe(input);
    expect(assessment.evidence!.providerFeeComponents).not.toBe(
      input.providerFeeComponents,
    );
    expect(assessment.evidence!.observedAt).not.toBe(input.observedAt);
  });

  it.each([
    ['5.9', 'below_accepted_minimum'],
    ['5.92025', 'minimum_satisfied_below_expected'],
    ['5.95', 'expected_output_satisfied'],
    ['6', 'expected_output_satisfied'],
  ])('classifies actual output %s as %s', (actualUsdtReceived, expected) => {
    expect(
      assessFundingConversionFinancialReconciliationEvidence(
        context(),
        evidence({ actualUsdtReceived }),
      ).outputAssessment,
    ).toBe(expected);
  });

  it('blocks evidence until the durable provider status is FINISHED', () => {
    const pending = context({
      statusObservation: storedStatus({
        providerStatus: 'PENDING',
        transactionHash: null,
        terminal: false,
        executionSucceeded: false,
      }),
    });

    const assessment = assessFundingConversionFinancialReconciliationEvidence(
      pending,
      evidence(),
    );

    expect(assessment.status).toBe('blocked');
    expect(assessment.blockers).toContain('provider_execution_not_finished');
    expect(assessment.financialReconciliationComplete).toBe(false);
  });

  it.each([
    [
      { attemptId: '019a0db1-bfea-7000-8000-000000000099' },
      'financial_evidence_identity_mismatch',
    ],
    [
      { providerOrderId: 'different_order' },
      'financial_evidence_identity_mismatch',
    ],
    [
      { statusObservationId: '019a0db1-bfea-7000-8000-000000000099' },
      'financial_evidence_identity_mismatch',
    ],
    [
      { transactionHash: `0x${'b'.repeat(64)}` },
      'financial_evidence_transaction_mismatch',
    ],
    [
      { sourceTokenAddress: BSC_USDT_ADDRESS.toLowerCase() },
      'financial_evidence_token_mismatch',
    ],
    [
      { submittedSourceQuantityBnb: '0.007' },
      'financial_evidence_source_quantity_mismatch',
    ],
    [
      { observedAt: new Date('2026-10-22T12:00:31.999Z') },
      'financial_evidence_predates_status',
    ],
  ] as const)('blocks divergent correlated evidence %#', (changed, blocker) => {
    expect(
      assessFundingConversionFinancialReconciliationEvidence(
        context(),
        evidence(changed),
      ).blockers,
    ).toContain(blocker);
  });

  it.each([
    { actualUsdtReceived: '0' },
    { networkFeeQuantityBnb: '0' },
    { sourceBalanceDeltaObserved: false as true },
    { providerFeeCoverageComplete: false as true },
    { observedAt: new Date(Number.NaN) },
    {
      providerFeeComponents: [
        { assetAddress: BSC_USDT_ADDRESS, quantity: '0.01' },
        { assetAddress: BSC_USDT_ADDRESS, quantity: '0.02' },
      ],
    },
    {
      providerFeeComponents: [
        { assetAddress: `0x${'1'.repeat(40)}`, quantity: '0.01' },
      ],
    },
  ])('blocks malformed or incomplete evidence %#', (changed) => {
    const assessment = assessFundingConversionFinancialReconciliationEvidence(
      context(),
      evidence(changed),
    );

    expect(assessment.blockers).toContain('invalid_financial_evidence');
    expect(assessment.evidence).toBeNull();
  });

  it('blocks malformed context independently from valid evidence', () => {
    const assessment = assessFundingConversionFinancialReconciliationEvidence(
      context({ minimumUsdt: '5.96' }),
      evidence(),
    );

    expect(assessment.blockers).toEqual(['invalid_reconciliation_context']);
  });

  it('exports the same strict structural evidence validator', () => {
    expect(
      isValidFundingConversionFinancialReconciliationEvidence(evidence()),
    ).toBe(true);
    expect(
      isValidFundingConversionFinancialReconciliationEvidence({
        ...evidence(),
        targetBalanceDeltaObserved: false,
      }),
    ).toBe(false);
  });
});

function context(
  changed: Partial<FundingConversionFinancialReconciliationContext> = {},
): FundingConversionFinancialReconciliationContext {
  return {
    scope: 'agentic_wallet_funding_conversion_financial_reconciliation_context',
    attemptId: ATTEMPT_ID,
    planId: PLAN_ID,
    providerOrderId: 'order_123',
    sourceQuantityBnb: '0.008',
    expectedUsdt: '5.95',
    minimumUsdt: '5.92025',
    statusObservation: storedStatus(),
    ...changed,
  };
}

function storedStatus(
  changed: Partial<
    StoredFundingConversionStatusObservation['observation']
  > = {},
): StoredFundingConversionStatusObservation {
  return {
    id: OBSERVATION_ID,
    observation: {
      attemptId: ATTEMPT_ID,
      providerOrderId: 'order_123',
      providerStatus: 'FINISHED',
      transactionHash: TRANSACTION_HASH,
      bookedAt: new Date('2026-10-22T12:00:30.000Z'),
      providerUpdatedAt: new Date('2026-10-22T12:00:31.000Z'),
      terminal: true,
      executionSucceeded: true,
      financialReconciliationRequired: true,
      financialReconciliationComplete: false,
      automaticRetryAllowed: false,
      ...changed,
    },
    recordedAt: new Date('2026-10-22T12:00:32.000Z'),
  };
}

function evidence(
  changed: Partial<FundingConversionFinancialReconciliationEvidence> = {},
): FundingConversionFinancialReconciliationEvidence {
  return {
    scope:
      'agentic_wallet_funding_conversion_financial_reconciliation_evidence',
    attemptId: ATTEMPT_ID,
    providerOrderId: 'order_123',
    statusObservationId: OBSERVATION_ID,
    transactionHash: TRANSACTION_HASH,
    chainId: '56',
    sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(),
    targetTokenAddress: BSC_USDT_ADDRESS.toLowerCase(),
    submittedSourceQuantityBnb: '0.008',
    actualUsdtReceived: '5.93',
    providerFeeComponents: [
      { assetAddress: BSC_USDT_ADDRESS.toLowerCase(), quantity: '0.01' },
      { assetAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(), quantity: '0' },
    ],
    networkFeeAsset: 'BNB',
    networkFeeQuantityBnb: '0.00002',
    transactionReceiptObserved: true,
    sourceBalanceDeltaObserved: true,
    targetBalanceDeltaObserved: true,
    providerFeeCoverageComplete: true,
    networkFeeCoverageComplete: true,
    observedAt: new Date('2026-10-22T12:00:33.000Z'),
    ...changed,
  };
}
