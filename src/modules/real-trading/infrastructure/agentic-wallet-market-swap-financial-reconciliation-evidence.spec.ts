import { StoredRealExecutionSubmissionGate } from '../application/real-execution-submission-gate-store';
import {
  AgenticWalletMarketSwapFinancialReconciliationEvidence,
  assessAgenticWalletMarketSwapFinancialReconciliationEvidence,
} from './agentic-wallet-market-swap-financial-reconciliation-evidence';
import { AgenticWalletMarketSwapReconciliationState } from './agentic-wallet-market-swap-reconciliation-state.store';

const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OBSERVATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';

describe('assessAgenticWalletMarketSwapFinancialReconciliationEvidence', () => {
  it('produces an inert persistence-ready snapshot from complete correlated evidence', () => {
    const input = evidence();
    const assessment =
      assessAgenticWalletMarketSwapFinancialReconciliationEvidence(
        gate(),
        finishedState(),
        input,
      );

    expect(assessment).toEqual({
      scope:
        'agentic_wallet_market_swap_financial_reconciliation_evidence_assessment',
      status: 'evidence_ready_for_persistence',
      blockers: [],
      evidence: input,
      actualReceivedQuantity: '0.000071',
      persistenceRequired: true,
      financialReconciliationRequired: true,
      financialReconciliationComplete: false,
      submissionRetryAllowed: false,
    });
    expect(assessment.evidence).not.toBe(input);
    expect(assessment.evidence!.providerFeeComponents).not.toBe(
      input.providerFeeComponents,
    );
    expect(assessment.evidence!.observedAt).not.toBe(input.observedAt);
  });

  it('blocks evidence until provider execution is finished', () => {
    const assessment =
      assessAgenticWalletMarketSwapFinancialReconciliationEvidence(
        gate(),
        pendingState(),
        evidence(),
      );

    expect(assessment.status).toBe('blocked');
    expect(assessment.blockers).toContain('provider_execution_not_finished');
    expect(assessment.actualReceivedQuantity).toBeNull();
    expect(assessment.persistenceRequired).toBe(false);
  });

  it.each([
    { gateId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' },
    { providerOrderId: 'different-order' },
    { statusObservationId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' },
  ])('blocks divergent evidence identity %#', (override) => {
    const assessment =
      assessAgenticWalletMarketSwapFinancialReconciliationEvidence(
        gate(),
        finishedState(),
        evidence(override),
      );

    expect(assessment.blockers).toContain(
      'financial_evidence_identity_mismatch',
    );
  });

  it('blocks transaction, token, source quantity, and observation-time divergence', () => {
    const scenarios: readonly [
      Partial<AgenticWalletMarketSwapFinancialReconciliationEvidence>,
      string,
    ][] = [
      [
        { transactionHash: `0x${'b'.repeat(64)}` },
        'financial_evidence_transaction_mismatch',
      ],
      [
        { sourceTokenAddress: BTCB, targetTokenAddress: USDT },
        'financial_evidence_token_mismatch',
      ],
      [
        { submittedSourceQuantity: '6' },
        'financial_evidence_source_quantity_mismatch',
      ],
      [
        { observedAt: new Date('2026-10-03T12:00:05.999Z') },
        'financial_evidence_predates_status',
      ],
    ];

    for (const [override, blocker] of scenarios) {
      expect(
        assessAgenticWalletMarketSwapFinancialReconciliationEvidence(
          gate(),
          finishedState(),
          evidence(override),
        ).blockers,
      ).toContain(blocker);
    }
  });

  it.each([
    { actualTargetReceivedQuantity: '0' },
    { networkFeeQuantity: '0' },
    { providerFeeCoverageComplete: false as true },
    { targetBalanceDeltaObserved: false as true },
    { observedAt: new Date(Number.NaN) },
    {
      providerFeeComponents: [
        { assetAddress: USDT, quantity: '0.01' },
        { assetAddress: USDT, quantity: '0.02' },
      ],
    },
  ])('blocks malformed or incomplete financial evidence %#', (override) => {
    const assessment =
      assessAgenticWalletMarketSwapFinancialReconciliationEvidence(
        gate(),
        finishedState(),
        evidence(override),
      );

    expect(assessment.blockers).toContain('invalid_financial_evidence');
  });

  it('blocks invalid gate and reconciliation state independently', () => {
    const assessment =
      assessAgenticWalletMarketSwapFinancialReconciliationEvidence(
        gate({ sourceQuantity: '5.0' }),
        finishedState({ actualReceivedQuantity: '1' as null }),
        evidence(),
      );

    expect(assessment.blockers).toEqual([
      'invalid_submission_gate',
      'invalid_reconciliation_state',
    ]);
  });
});

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
    providerFeeComponents: [],
    networkFeeAsset: 'BNB',
    networkFeeQuantity: '0.0003',
    transactionReceiptObserved: true,
    targetBalanceDeltaObserved: true,
    providerFeeCoverageComplete: true,
    networkFeeCoverageComplete: true,
    observedAt: new Date('2026-10-03T12:00:07.000Z'),
    ...overrides,
  };
}

function finishedState(
  overrides: Partial<AgenticWalletMarketSwapReconciliationState> = {},
): AgenticWalletMarketSwapReconciliationState {
  return {
    scope: 'agentic_wallet_market_swap_reconciliation_state',
    providerId: 'agentic_wallet',
    gateId: GATE_ID,
    providerOrderId: '1234567890',
    phase: 'provider_finished_financial_reconciliation_required',
    providerStatus: 'FINISHED',
    transactionHash: TRANSACTION_HASH,
    receiptRecordedAt: new Date('2026-10-03T12:00:05.000Z'),
    latestObservationId: OBSERVATION_ID,
    latestObservationRecordedAt: new Date('2026-10-03T12:00:06.000Z'),
    terminal: true,
    executionSucceeded: true,
    statusLookupRequired: false,
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    actualReceivedQuantity: null,
    submissionRetryAllowed: false,
    ...overrides,
  };
}

function pendingState(): AgenticWalletMarketSwapReconciliationState {
  return finishedState({
    phase: 'provider_pending',
    providerStatus: 'PENDING',
    transactionHash: null,
    terminal: false,
    executionSucceeded: false,
    statusLookupRequired: true,
  });
}

function gate(
  overrides: Partial<StoredRealExecutionSubmissionGate> = {},
): StoredRealExecutionSubmissionGate {
  return {
    id: GATE_ID,
    confirmationId: '88888888-8888-4888-8888-888888888888',
    approvalId: '77777777-7777-4777-8777-777777777777',
    reservationId: '33333333-3333-4333-8333-333333333333',
    armId: '55555555-5555-4555-8555-555555555555',
    submissionPlanId: '99999999-9999-4999-8999-999999999999',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'c'.repeat(64),
    emergencyStopChangeId: 'real-trading-stop-clear-1',
    sourceTokenAddress: USDT,
    targetTokenAddress: BTCB,
    sourceQuantity: '5',
    maximumSlippagePercent: '0.1',
    mevProtection: true,
    gasLevel: 'MEDIUM',
    status: 'prepared_not_submitted',
    emergencyStopRecheckedAt: new Date('2026-10-03T12:00:04.000Z'),
    confirmationConsumedAt: new Date('2026-10-03T12:00:04.000Z'),
    expiresAt: new Date('2026-10-03T12:00:07.000Z'),
    createdAt: new Date('2026-10-03T12:00:04.100Z'),
    atomicGateSatisfied: true,
    confirmationConsumed: true,
    providerSubmissionStarted: false,
    submissionAuthorized: false,
    ...overrides,
  };
}
