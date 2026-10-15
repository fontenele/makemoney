import { AgenticWalletMarketSwapBalanceChange } from './agentic-wallet-market-swap-accounting-balance-evidence';
import {
  AgenticWalletMarketSwapAccountingMutationCommitmentAssessment,
  prepareAgenticWalletMarketSwapAccountingMutationCommitment,
} from './agentic-wallet-market-swap-accounting-mutation-commitment';
import { AgenticWalletMarketSwapAccountingMutationPlan } from './agentic-wallet-market-swap-accounting-mutation-plan';

const MUTATION_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const ACCOUNTING_EVIDENCE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const COMPLETION_EVIDENCE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const PREPARED_AT = new Date('2026-10-03T12:00:11.000Z');

describe('prepareAgenticWalletMarketSwapAccountingMutationCommitment', () => {
  it('commits one valid inert plan with a canonical SHA-256 fingerprint', () => {
    const assessment = prepare(
      plan({
        balanceTransitions: [tokenCredit(), nativeDebit(), tokenDebit()],
      }),
    );

    expect(assessment).toMatchObject({
      status: 'accounting_mutation_commitment_ready',
      blockers: [],
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationAuthorized: false,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
      commitment: {
        mutationId: MUTATION_ID,
        accountingMutationAuthorized: false,
        accountingMutationComplete: false,
        submissionRetryAllowed: false,
      },
    });
    expect(assessment.commitment!.planFingerprint).toMatch(/^[0-9a-f]{64}$/);
    expect(assessment.commitment!.plan.balanceTransitions).toEqual([
      nativeDebit(),
      tokenDebit(),
      tokenCredit(),
    ]);
  });

  it('produces the same plan fingerprint independently of transition order and mutation identity', () => {
    const first = prepare(plan()).commitment!;
    const second = prepareAgenticWalletMarketSwapAccountingMutationCommitment(
      plan({
        balanceTransitions: [tokenCredit(), tokenDebit(), nativeDebit()],
      }),
      'ffffffff-ffff-4fff-8fff-ffffffffffff',
      PREPARED_AT,
    ).commitment!;

    expect(second.planFingerprint).toBe(first.planFingerprint);
  });

  it('canonicalizes transition property order for the same exact plan facts', () => {
    const first = prepare(plan()).commitment!;
    const reorderedPropertyTransition = {
      deltaQuantity: '5.005',
      afterQuantity: '94.995',
      beforeQuantity: '100',
      direction: 'debit' as const,
      assetAddress: USDT,
      assetType: 'token' as const,
    };
    const second = prepare(
      plan({
        balanceTransitions: [
          reorderedPropertyTransition,
          tokenCredit(),
          nativeDebit(),
        ],
      }),
    ).commitment!;

    expect(second.planFingerprint).toBe(first.planFingerprint);
  });

  it('changes the fingerprint when an exact transition changes coherently', () => {
    const first = prepare(plan()).commitment!;
    const changed = prepare(
      plan({
        balanceTransitions: [
          tokenDebit({
            beforeQuantity: '101',
            afterQuantity: '95.995',
          }),
          tokenCredit(),
          nativeDebit(),
        ],
      }),
    ).commitment!;

    expect(changed.planFingerprint).not.toBe(first.planFingerprint);
  });

  it('defensively copies the plan, transitions, and timestamps', () => {
    const input = plan();
    const commitment = prepare(input).commitment!;

    expect(commitment.plan).not.toBe(input);
    expect(commitment.plan.balanceTransitions).not.toBe(
      input.balanceTransitions,
    );
    expect(commitment.plan.balanceTransitions[0]).not.toBe(
      input.balanceTransitions[2],
    );
    expect(commitment.plan.evidenceObservedAt).not.toBe(
      input.evidenceObservedAt,
    );
    expect(commitment.plan.evidenceRecordedAt).not.toBe(
      input.evidenceRecordedAt,
    );
    expect(commitment.preparedAt).not.toBe(PREPARED_AT);
  });

  it.each([
    { accountingEvidenceId: 'not-a-uuid' },
    { completionEvidenceId: 'not-a-uuid' },
    { gateId: 'not-a-uuid' },
    { transactionHash: 'not-a-transaction-hash' },
    { balanceTransitions: [] },
    { balanceTransitions: [tokenDebit(), tokenDebit()] },
    {
      balanceTransitions: [
        tokenDebit({ afterQuantity: '95', deltaQuantity: '5.005' }),
        tokenCredit(),
        nativeDebit(),
      ],
    },
    { evidenceObservedAt: new Date(Number.NaN) },
    { evidenceObservedAt: 'not-a-date' as unknown as Date },
    { evidenceRecordedAt: new Date(Number.NaN) },
    { financialReconciliationComplete: false as true },
    { accountingMutationRequired: false as true },
    { accountingMutationAuthorized: true as false },
    { accountingMutationComplete: true as false },
    { submissionRetryAllowed: true as false },
  ])('blocks an invalid accounting mutation plan %#', (override) => {
    const assessment = prepare(plan(override));

    expect(assessment.blockers).toContain('invalid_accounting_mutation_plan');
    expect(assessment.commitment).toBeNull();
    expect(assessment.financialReconciliationComplete).toBe(false);
    expect(assessment.accountingMutationRequired).toBe(false);
  });

  it('blocks an invalid mutation identity independently', () => {
    expect(prepare(plan(), 'not-a-uuid').blockers).toEqual([
      'invalid_accounting_mutation_identity',
    ]);
  });

  it('blocks an invalid preparation time independently', () => {
    expect(prepare(plan(), MUTATION_ID, new Date(Number.NaN)).blockers).toEqual(
      ['invalid_accounting_mutation_prepared_at'],
    );
  });

  it('blocks preparation before durable evidence recording', () => {
    const assessment = prepare(
      plan(),
      MUTATION_ID,
      new Date('2026-10-03T12:00:09.999Z'),
    );

    expect(assessment.blockers).toEqual([
      'accounting_mutation_preparation_predates_evidence',
    ]);
    expect(assessment.financialReconciliationComplete).toBe(true);
    expect(assessment.accountingMutationRequired).toBe(true);
  });
});

function prepare(
  value: AgenticWalletMarketSwapAccountingMutationPlan,
  mutationId = MUTATION_ID,
  preparedAt = PREPARED_AT,
): AgenticWalletMarketSwapAccountingMutationCommitmentAssessment {
  return prepareAgenticWalletMarketSwapAccountingMutationCommitment(
    value,
    mutationId,
    preparedAt,
  );
}

function plan(
  overrides: Partial<AgenticWalletMarketSwapAccountingMutationPlan> = {},
): AgenticWalletMarketSwapAccountingMutationPlan {
  return {
    scope: 'agentic_wallet_market_swap_accounting_mutation_plan',
    accountingEvidenceId: ACCOUNTING_EVIDENCE_ID,
    completionEvidenceId: COMPLETION_EVIDENCE_ID,
    gateId: GATE_ID,
    transactionHash: TRANSACTION_HASH,
    balanceTransitions: [tokenDebit(), tokenCredit(), nativeDebit()],
    evidenceObservedAt: new Date('2026-10-03T12:00:09.000Z'),
    evidenceRecordedAt: new Date('2026-10-03T12:00:10.000Z'),
    financialReconciliationComplete: true,
    accountingMutationRequired: true,
    accountingMutationAuthorized: false,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
    ...overrides,
  };
}

function tokenDebit(
  overrides: Partial<AgenticWalletMarketSwapBalanceChange> = {},
): AgenticWalletMarketSwapBalanceChange {
  return {
    assetType: 'token',
    assetAddress: USDT,
    direction: 'debit',
    beforeQuantity: '100',
    afterQuantity: '94.995',
    deltaQuantity: '5.005',
    ...overrides,
  } as AgenticWalletMarketSwapBalanceChange;
}

function tokenCredit(): AgenticWalletMarketSwapBalanceChange {
  return {
    assetType: 'token',
    assetAddress: BTCB,
    direction: 'credit',
    beforeQuantity: '0',
    afterQuantity: '0.000071',
    deltaQuantity: '0.000071',
  };
}

function nativeDebit(): AgenticWalletMarketSwapBalanceChange {
  return {
    assetType: 'native',
    assetSymbol: 'BNB',
    direction: 'debit',
    beforeQuantity: '1',
    afterQuantity: '0.9997',
    deltaQuantity: '0.0003',
  };
}
