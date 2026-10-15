import { AgenticWalletMarketSwapAccountingBalanceEvidence } from './agentic-wallet-market-swap-accounting-balance-evidence';
import { StoredAgenticWalletMarketSwapAccountingBalanceEvidence } from './agentic-wallet-market-swap-accounting-balance-evidence.store';
import { assessAgenticWalletMarketSwapAccountingMutationPlan } from './agentic-wallet-market-swap-accounting-mutation-plan';

const ACCOUNTING_EVIDENCE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const COMPLETION_EVIDENCE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';

describe('assessAgenticWalletMarketSwapAccountingMutationPlan', () => {
  it('projects validated durable evidence into an exact inert mutation plan', () => {
    const assessment =
      assessAgenticWalletMarketSwapAccountingMutationPlan(storedEvidence());

    expect(assessment).toMatchObject({
      status: 'accounting_mutation_plan_ready',
      blockers: [],
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationAuthorized: false,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    });
    expect(assessment.plan).toEqual({
      scope: 'agentic_wallet_market_swap_accounting_mutation_plan',
      accountingEvidenceId: ACCOUNTING_EVIDENCE_ID,
      completionEvidenceId: COMPLETION_EVIDENCE_ID,
      gateId: GATE_ID,
      transactionHash: TRANSACTION_HASH,
      balanceTransitions: [nativeDebit(), tokenDebit(), tokenCredit()],
      evidenceObservedAt: new Date('2026-10-03T12:00:09.000Z'),
      evidenceRecordedAt: new Date('2026-10-03T12:00:10.000Z'),
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationAuthorized: false,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    });
  });

  it('defensively copies transitions and timestamps', () => {
    const stored = storedEvidence();
    const plan =
      assessAgenticWalletMarketSwapAccountingMutationPlan(stored).plan!;

    expect(plan.balanceTransitions).not.toBe(stored.evidence.balanceChanges);
    expect(plan.balanceTransitions[0]).not.toBe(
      stored.evidence.balanceChanges[2],
    );
    expect(plan.evidenceObservedAt).not.toBe(stored.evidence.observedAt);
    expect(plan.evidenceRecordedAt).not.toBe(stored.recordedAt);
  });

  it.each([
    { id: 'not-a-uuid' },
    { recordedAt: new Date(Number.NaN) },
    { recordedAt: new Date('2026-10-03T12:00:08.999Z') },
  ])('blocks an invalid stored envelope %#', (override) => {
    expect(
      assessAgenticWalletMarketSwapAccountingMutationPlan(
        storedEvidence(override),
      ),
    ).toEqual(blockedAssessment());
  });

  it.each([
    { completionEvidenceId: 'not-a-uuid' },
    { gateId: 'not-a-uuid' },
    { transactionHash: 'not-a-transaction-hash' },
    { coverageComplete: false as true },
    { observedAt: new Date(Number.NaN) },
    { balanceChanges: [] },
    { balanceChanges: [tokenDebit(), tokenDebit()] },
    {
      balanceChanges: [
        tokenDebit({ afterQuantity: '95', deltaQuantity: '5.005' }),
        tokenCredit(),
        nativeDebit(),
      ],
    },
  ])('blocks malformed accounting evidence %#', (override) => {
    expect(
      assessAgenticWalletMarketSwapAccountingMutationPlan(
        storedEvidence({}, override),
      ),
    ).toEqual(blockedAssessment());
  });

  it('never authorizes or completes accounting mutation', () => {
    const assessment =
      assessAgenticWalletMarketSwapAccountingMutationPlan(storedEvidence());

    expect(assessment.accountingMutationAuthorized).toBe(false);
    expect(assessment.accountingMutationComplete).toBe(false);
    expect(assessment.submissionRetryAllowed).toBe(false);
    expect(assessment.plan).toMatchObject({
      accountingMutationAuthorized: false,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    });
  });
});

function storedEvidence(
  overrides: Partial<StoredAgenticWalletMarketSwapAccountingBalanceEvidence> = {},
  evidenceOverrides: Partial<AgenticWalletMarketSwapAccountingBalanceEvidence> = {},
): StoredAgenticWalletMarketSwapAccountingBalanceEvidence {
  return {
    id: ACCOUNTING_EVIDENCE_ID,
    evidence: {
      scope: 'agentic_wallet_market_swap_accounting_balance_evidence',
      completionEvidenceId: COMPLETION_EVIDENCE_ID,
      gateId: GATE_ID,
      transactionHash: TRANSACTION_HASH,
      balanceChanges: [tokenDebit(), tokenCredit(), nativeDebit()],
      coverageComplete: true,
      observedAt: new Date('2026-10-03T12:00:09.000Z'),
      ...evidenceOverrides,
    },
    recordedAt: new Date('2026-10-03T12:00:10.000Z'),
    ...overrides,
  };
}

function tokenDebit(overrides = {}) {
  return {
    assetType: 'token' as const,
    assetAddress: USDT,
    direction: 'debit' as const,
    beforeQuantity: '100',
    afterQuantity: '94.995',
    deltaQuantity: '5.005',
    ...overrides,
  };
}

function tokenCredit() {
  return {
    assetType: 'token' as const,
    assetAddress: BTCB,
    direction: 'credit' as const,
    beforeQuantity: '0',
    afterQuantity: '0.000071',
    deltaQuantity: '0.000071',
  };
}

function nativeDebit() {
  return {
    assetType: 'native' as const,
    assetSymbol: 'BNB' as const,
    direction: 'debit' as const,
    beforeQuantity: '1',
    afterQuantity: '0.9997',
    deltaQuantity: '0.0003',
  };
}

function blockedAssessment() {
  return {
    scope: 'agentic_wallet_market_swap_accounting_mutation_plan_assessment',
    status: 'blocked',
    blockers: ['invalid_stored_accounting_balance_evidence'],
    plan: null,
    financialReconciliationComplete: false,
    accountingMutationRequired: false,
    accountingMutationAuthorized: false,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
  };
}
