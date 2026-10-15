import { AgenticWalletMarketSwapBalanceChange } from './agentic-wallet-market-swap-accounting-balance-evidence';
import { prepareAgenticWalletMarketSwapAccountingMutationCommitment } from './agentic-wallet-market-swap-accounting-mutation-commitment';
import {
  ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
  AgenticWalletMarketSwapAccountingMutationAuthorizationRequest,
  authorizeAgenticWalletMarketSwapAccountingMutation,
} from './agentic-wallet-market-swap-accounting-mutation-authorization';
import { StoredAgenticWalletMarketSwapAccountingMutationCommitment } from './agentic-wallet-market-swap-accounting-mutation-commitment.store';
import { AgenticWalletMarketSwapAccountingMutationPlan } from './agentic-wallet-market-swap-accounting-mutation-plan';

const AUTHORIZATION_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const MUTATION_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const ACCOUNTING_EVIDENCE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const COMPLETION_EVIDENCE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const PREPARED_AT = new Date('2026-10-03T12:00:11.000Z');
const RECORDED_AT = new Date('2026-10-03T12:00:12.000Z');
const AUTHORIZED_AT = new Date('2026-10-03T12:00:13.000Z');

describe('authorizeAgenticWalletMarketSwapAccountingMutation', () => {
  it('authorizes only the exact durable commitment and remains incomplete', () => {
    const stored = storedCommitment();
    const input = request(stored);

    const assessment = authorizeAgenticWalletMarketSwapAccountingMutation(
      stored,
      input,
    );

    expect(assessment).toMatchObject({
      scope:
        'agentic_wallet_market_swap_accounting_mutation_authorization_assessment',
      status: 'accounting_mutation_authorization_ready',
      blockers: [],
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationAuthorized: true,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
      authorization: {
        scope: 'agentic_wallet_market_swap_accounting_mutation_authorization',
        authorizationId: AUTHORIZATION_ID,
        acknowledgment: ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
        authorizedAt: AUTHORIZED_AT,
        accountingMutationAuthorized: true,
        accountingMutationComplete: false,
        submissionRetryAllowed: false,
      },
    });
    expect(assessment.authorization!.commitment).toEqual(stored);
  });

  it('returns defensive commitment, transition, and date snapshots', () => {
    const stored = storedCommitment();
    const input = request(stored);

    const authorization = authorizeAgenticWalletMarketSwapAccountingMutation(
      stored,
      input,
    ).authorization!;

    expect(authorization.commitment).not.toBe(stored);
    expect(authorization.commitment.commitment).not.toBe(stored.commitment);
    expect(authorization.commitment.commitment.plan).not.toBe(
      stored.commitment.plan,
    );
    expect(
      authorization.commitment.commitment.plan.balanceTransitions,
    ).not.toBe(stored.commitment.plan.balanceTransitions);
    expect(authorization.commitment.recordedAt).not.toBe(stored.recordedAt);
    expect(authorization.authorizedAt).not.toBe(input.authorizedAt);
  });

  it('blocks invalid durable commitment state without granting financial facts', () => {
    const stored = storedCommitment();
    const malformed = {
      ...stored,
      commitment: {
        ...stored.commitment,
        accountingMutationAuthorized: true,
      },
    } as unknown as StoredAgenticWalletMarketSwapAccountingMutationCommitment;

    const assessment = authorizeAgenticWalletMarketSwapAccountingMutation(
      malformed,
      request(stored),
    );

    expect(assessment.blockers).toContain(
      'invalid_stored_accounting_mutation_commitment',
    );
    expect(assessment.authorization).toBeNull();
    expect(assessment.financialReconciliationComplete).toBe(false);
    expect(assessment.accountingMutationRequired).toBe(false);
    expect(assessment.accountingMutationAuthorized).toBe(false);
  });

  it.each([
    { authorizationId: 'not-a-uuid' },
    { mutationId: 'not-a-uuid' },
    { planFingerprint: 'not-a-fingerprint' },
    { gateId: 'not-a-uuid' },
    { transactionHash: 'not-a-hash' },
    { authorizedAt: new Date(Number.NaN) },
    { authorizedAt: 'not-a-date' as unknown as Date },
  ])('blocks malformed authorization request %#', (override) => {
    const stored = storedCommitment();
    const assessment = authorizeAgenticWalletMarketSwapAccountingMutation(
      stored,
      request(stored, override),
    );

    expect(assessment.blockers).toContain(
      'invalid_accounting_mutation_authorization_request',
    );
    expect(assessment.authorization).toBeNull();
    expect(assessment.accountingMutationAuthorized).toBe(false);
  });

  it('requires the exact accounting authorization acknowledgment', () => {
    const stored = storedCommitment();
    const assessment = authorizeAgenticWalletMarketSwapAccountingMutation(
      stored,
      request(stored, { acknowledgment: 'missing' as never }),
    );

    expect(assessment.blockers).toEqual([
      'accounting_mutation_authorization_acknowledgment_missing',
    ]);
  });

  it.each([
    [
      { mutationId: '11111111-1111-4111-8111-111111111111' },
      'authorization_mutation_mismatch',
    ],
    [
      { planFingerprint: 'f'.repeat(64) },
      'authorization_plan_fingerprint_mismatch',
    ],
    [
      { gateId: '11111111-1111-4111-8111-111111111111' },
      'authorization_gate_mismatch',
    ],
    [
      { transactionHash: `0x${'f'.repeat(64)}` },
      'authorization_transaction_mismatch',
    ],
  ])('blocks correlation divergence %#', (override, blocker) => {
    const stored = storedCommitment();
    const assessment = authorizeAgenticWalletMarketSwapAccountingMutation(
      stored,
      request(stored, override),
    );

    expect(assessment.blockers).toEqual([blocker]);
    expect(assessment.authorization).toBeNull();
  });

  it('blocks authorization before durable commitment recording', () => {
    const stored = storedCommitment();
    const assessment = authorizeAgenticWalletMarketSwapAccountingMutation(
      stored,
      request(stored, {
        authorizedAt: new Date('2026-10-03T12:00:11.999Z'),
      }),
    );

    expect(assessment.blockers).toEqual([
      'accounting_mutation_authorization_predates_commitment',
    ]);
    expect(assessment.financialReconciliationComplete).toBe(true);
    expect(assessment.accountingMutationRequired).toBe(true);
    expect(assessment.accountingMutationAuthorized).toBe(false);
  });

  it('accepts authorization exactly at durable commitment recording time', () => {
    const stored = storedCommitment();

    expect(
      authorizeAgenticWalletMarketSwapAccountingMutation(
        stored,
        request(stored, { authorizedAt: RECORDED_AT }),
      ).status,
    ).toBe('accounting_mutation_authorization_ready');
  });
});

function storedCommitment(): StoredAgenticWalletMarketSwapAccountingMutationCommitment {
  const assessment = prepareAgenticWalletMarketSwapAccountingMutationCommitment(
    plan(),
    MUTATION_ID,
    PREPARED_AT,
  );
  if (assessment.commitment === null)
    throw new Error('Test commitment is blocked');
  return {
    commitment: assessment.commitment,
    recordedAt: RECORDED_AT,
  };
}

function request(
  stored: StoredAgenticWalletMarketSwapAccountingMutationCommitment,
  overrides: Partial<AgenticWalletMarketSwapAccountingMutationAuthorizationRequest> = {},
): AgenticWalletMarketSwapAccountingMutationAuthorizationRequest {
  return {
    authorizationId: AUTHORIZATION_ID,
    mutationId: stored.commitment.mutationId,
    planFingerprint: stored.commitment.planFingerprint,
    gateId: stored.commitment.plan.gateId,
    transactionHash: stored.commitment.plan.transactionHash,
    acknowledgment: ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
    authorizedAt: AUTHORIZED_AT,
    ...overrides,
  };
}

function plan(): AgenticWalletMarketSwapAccountingMutationPlan {
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
  };
}

function tokenDebit(): AgenticWalletMarketSwapBalanceChange {
  return {
    assetType: 'token',
    assetAddress: USDT,
    direction: 'debit',
    beforeQuantity: '100',
    afterQuantity: '94.995',
    deltaQuantity: '5.005',
  };
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
