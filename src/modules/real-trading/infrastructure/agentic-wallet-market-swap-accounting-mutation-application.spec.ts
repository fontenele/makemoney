import { AgenticWalletMarketSwapBalanceChange } from './agentic-wallet-market-swap-accounting-balance-evidence';
import {
  ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT,
  AgenticWalletMarketSwapAccountingMutationApplicationRequest,
  AgenticWalletMarketSwapLocalAccountingBalance,
  prepareAgenticWalletMarketSwapAccountingMutationApplication,
} from './agentic-wallet-market-swap-accounting-mutation-application';
import {
  ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
  authorizeAgenticWalletMarketSwapAccountingMutation,
} from './agentic-wallet-market-swap-accounting-mutation-authorization';
import { StoredAgenticWalletMarketSwapAccountingMutationAuthorization } from './agentic-wallet-market-swap-accounting-mutation-authorization.store';
import { prepareAgenticWalletMarketSwapAccountingMutationCommitment } from './agentic-wallet-market-swap-accounting-mutation-commitment';
import { AgenticWalletMarketSwapAccountingMutationPlan } from './agentic-wallet-market-swap-accounting-mutation-plan';

const APPLICATION_ID = '99999999-9999-4999-8999-999999999999';
const AUTHORIZATION_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const MUTATION_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const ACCOUNTING_EVIDENCE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const FINANCIAL_EVIDENCE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const COMMITMENT_PREPARED_AT = new Date('2026-10-03T12:00:11.000Z');
const COMMITMENT_RECORDED_AT = new Date('2026-10-03T12:00:12.000Z');
const AUTHORIZED_AT = new Date('2026-10-03T12:00:13.000Z');
const AUTHORIZATION_RECORDED_AT = new Date('2026-10-03T12:00:14.000Z');
const BALANCES_OBSERVED_AT = new Date('2026-10-03T12:00:15.000Z');
const APPLICATION_PREPARED_AT = new Date('2026-10-03T12:00:16.000Z');

describe('prepareAgenticWalletMarketSwapAccountingMutationApplication', () => {
  it('prepares only exact authorized transitions against matching local balances', () => {
    const stored = storedAuthorization();

    const assessment =
      prepareAgenticWalletMarketSwapAccountingMutationApplication(
        stored,
        request(stored),
      );

    expect(assessment).toMatchObject({
      scope:
        'agentic_wallet_market_swap_accounting_mutation_application_assessment',
      status: 'accounting_mutation_application_ready',
      blockers: [],
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationAuthorized: true,
      accountingMutationPrepared: true,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
      application: {
        scope: 'agentic_wallet_market_swap_accounting_mutation_application',
        applicationId: APPLICATION_ID,
        authorizationId: AUTHORIZATION_ID,
        mutationId: MUTATION_ID,
        gateId: GATE_ID,
        transactionHash: TRANSACTION_HASH,
        acknowledgment: ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT,
        accountingMutationPrepared: true,
        accountingMutationComplete: false,
        submissionRetryAllowed: false,
      },
    });
  });

  it('returns deterministically ordered defensive balance and transition snapshots', () => {
    const stored = storedAuthorization();
    const input = request(stored, {
      currentBalances: currentBalances().reverse(),
    });

    const application =
      prepareAgenticWalletMarketSwapAccountingMutationApplication(
        stored,
        input,
      ).application!;

    expect(application.currentBalances.map(identity)).toEqual([
      'native:BNB',
      `token:${USDT}`,
      `token:${BTCB}`,
    ]);
    expect(application.balanceTransitions.map(identity)).toEqual([
      'native:BNB',
      `token:${USDT}`,
      `token:${BTCB}`,
    ]);
    expect(application.currentBalances).not.toBe(input.currentBalances);
    expect(application.balanceTransitions).not.toBe(
      stored.authorization.commitment.commitment.plan.balanceTransitions,
    );
    expect(application.authorizationRecordedAt).not.toBe(stored.recordedAt);
    expect(application.balancesObservedAt).not.toBe(input.balancesObservedAt);
    expect(application.preparedAt).not.toBe(input.preparedAt);
  });

  it('blocks malformed durable authorization without granting financial facts', () => {
    const stored = storedAuthorization();
    const malformed = {
      ...stored,
      recordedAt: new Date('2026-10-03T12:00:12.999Z'),
    } as StoredAgenticWalletMarketSwapAccountingMutationAuthorization;

    const assessment =
      prepareAgenticWalletMarketSwapAccountingMutationApplication(
        malformed,
        request(stored),
      );

    expect(assessment.blockers).toContain(
      'invalid_stored_accounting_mutation_authorization',
    );
    expect(assessment.application).toBeNull();
    expect(assessment.financialReconciliationComplete).toBe(false);
    expect(assessment.accountingMutationRequired).toBe(false);
    expect(assessment.accountingMutationAuthorized).toBe(false);
  });

  it.each([
    { applicationId: 'not-a-uuid' },
    { authorizationId: 'not-a-uuid' },
    { mutationId: 'not-a-uuid' },
    { planFingerprint: 'not-a-fingerprint' },
    { gateId: 'not-a-uuid' },
    { transactionHash: 'not-a-hash' },
    { balancesObservedAt: new Date(Number.NaN) },
    { preparedAt: 'not-a-date' as unknown as Date },
    { currentBalances: [] },
    { balanceCoverageComplete: false as true },
  ])('blocks malformed application request %#', (override) => {
    const stored = storedAuthorization();
    const assessment =
      prepareAgenticWalletMarketSwapAccountingMutationApplication(
        stored,
        request(stored, override),
      );

    expect(assessment.blockers).toContain(
      'invalid_accounting_mutation_application_request',
    );
    expect(assessment.application).toBeNull();
    expect(assessment.accountingMutationAuthorized).toBe(true);
    expect(assessment.accountingMutationPrepared).toBe(false);
  });

  it.each([
    [
      { authorizationId: '11111111-1111-4111-8111-111111111111' },
      'application_authorization_mismatch',
    ],
    [
      { mutationId: '11111111-1111-4111-8111-111111111111' },
      'application_mutation_mismatch',
    ],
    [
      { planFingerprint: 'f'.repeat(64) },
      'application_plan_fingerprint_mismatch',
    ],
    [
      { gateId: '11111111-1111-4111-8111-111111111111' },
      'application_gate_mismatch',
    ],
    [
      { transactionHash: `0x${'f'.repeat(64)}` },
      'application_transaction_mismatch',
    ],
  ])('blocks application identity divergence %#', (override, blocker) => {
    const stored = storedAuthorization();

    const assessment =
      prepareAgenticWalletMarketSwapAccountingMutationApplication(
        stored,
        request(stored, override),
      );

    expect(assessment.blockers).toEqual([blocker]);
  });

  it('requires the exact application acknowledgment', () => {
    const stored = storedAuthorization();

    const assessment =
      prepareAgenticWalletMarketSwapAccountingMutationApplication(
        stored,
        request(stored, { acknowledgment: 'missing' as never }),
      );

    expect(assessment.blockers).toEqual([
      'accounting_mutation_application_acknowledgment_missing',
    ]);
  });

  it('rejects incomplete, missing, extra, duplicate, or malformed balances', () => {
    const stored = storedAuthorization();
    const cases: Partial<AgenticWalletMarketSwapAccountingMutationApplicationRequest>[] =
      [
        { balanceCoverageComplete: false as true },
        { currentBalances: currentBalances().slice(1) },
        {
          currentBalances: [
            ...currentBalances(),
            {
              assetType: 'token',
              assetAddress: '0x1111111111111111111111111111111111111111',
              currentQuantity: '1',
            },
          ],
        },
        {
          currentBalances: [currentBalances()[0], currentBalances()[0]],
        },
        {
          currentBalances: [{ ...currentBalances()[0], currentQuantity: '01' }],
        },
      ];

    const results = cases.map((override) =>
      prepareAgenticWalletMarketSwapAccountingMutationApplication(
        stored,
        request(stored, override),
      ),
    );

    expect(results[0].blockers).toContain(
      'invalid_accounting_mutation_application_request',
    );
    expect(results[1].blockers).toContain('ledger_balance_coverage_mismatch');
    expect(results[2].blockers).toContain('ledger_balance_coverage_mismatch');
    expect(results[3].blockers).toContain(
      'invalid_accounting_mutation_application_request',
    );
    expect(results[4].blockers).toContain(
      'invalid_accounting_mutation_application_request',
    );
  });

  it('rejects any local balance that differs from an authorized before quantity', () => {
    const stored = storedAuthorization();
    const balances = currentBalances();
    balances[2] = { ...balances[2], currentQuantity: '99' };

    const assessment =
      prepareAgenticWalletMarketSwapAccountingMutationApplication(
        stored,
        request(stored, { currentBalances: balances }),
      );

    expect(assessment.blockers).toEqual(['ledger_current_balance_mismatch']);
  });

  it('requires balance observation at or after durable authorization recording', () => {
    const stored = storedAuthorization();

    const assessment =
      prepareAgenticWalletMarketSwapAccountingMutationApplication(
        stored,
        request(stored, {
          balancesObservedAt: new Date('2026-10-03T12:00:13.999Z'),
        }),
      );

    expect(assessment.blockers).toEqual([
      'ledger_balances_predate_authorization',
    ]);
  });

  it('requires preparation at or after the local balance observation', () => {
    const stored = storedAuthorization();

    const assessment =
      prepareAgenticWalletMarketSwapAccountingMutationApplication(
        stored,
        request(stored, {
          preparedAt: new Date('2026-10-03T12:00:14.999Z'),
        }),
      );

    expect(assessment.blockers).toEqual([
      'accounting_mutation_application_predates_balances',
    ]);
  });

  it('accepts equality at both chronology boundaries', () => {
    const stored = storedAuthorization();

    expect(
      prepareAgenticWalletMarketSwapAccountingMutationApplication(
        stored,
        request(stored, {
          balancesObservedAt: AUTHORIZATION_RECORDED_AT,
          preparedAt: AUTHORIZATION_RECORDED_AT,
        }),
      ).status,
    ).toBe('accounting_mutation_application_ready');
  });
});

function storedAuthorization(): StoredAgenticWalletMarketSwapAccountingMutationAuthorization {
  const commitmentAssessment =
    prepareAgenticWalletMarketSwapAccountingMutationCommitment(
      plan(),
      MUTATION_ID,
      COMMITMENT_PREPARED_AT,
    );
  if (commitmentAssessment.commitment === null)
    throw new Error('Test commitment is blocked');
  const authorizationAssessment =
    authorizeAgenticWalletMarketSwapAccountingMutation(
      {
        commitment: commitmentAssessment.commitment,
        recordedAt: COMMITMENT_RECORDED_AT,
      },
      {
        authorizationId: AUTHORIZATION_ID,
        mutationId: MUTATION_ID,
        planFingerprint: commitmentAssessment.commitment.planFingerprint,
        gateId: GATE_ID,
        transactionHash: TRANSACTION_HASH,
        acknowledgment: ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
        authorizedAt: AUTHORIZED_AT,
      },
    );
  if (authorizationAssessment.authorization === null)
    throw new Error('Test authorization is blocked');
  return {
    authorization: authorizationAssessment.authorization,
    recordedAt: AUTHORIZATION_RECORDED_AT,
  };
}

function request(
  stored: StoredAgenticWalletMarketSwapAccountingMutationAuthorization,
  overrides: Partial<AgenticWalletMarketSwapAccountingMutationApplicationRequest> = {},
): AgenticWalletMarketSwapAccountingMutationApplicationRequest {
  const commitment = stored.authorization.commitment.commitment;
  return {
    applicationId: APPLICATION_ID,
    authorizationId: stored.authorization.authorizationId,
    mutationId: commitment.mutationId,
    planFingerprint: commitment.planFingerprint,
    gateId: commitment.plan.gateId,
    transactionHash: commitment.plan.transactionHash,
    acknowledgment: ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT,
    currentBalances: currentBalances(),
    balanceCoverageComplete: true,
    balancesObservedAt: BALANCES_OBSERVED_AT,
    preparedAt: APPLICATION_PREPARED_AT,
    ...overrides,
  };
}

function currentBalances(): AgenticWalletMarketSwapLocalAccountingBalance[] {
  return [
    { assetType: 'token', assetAddress: USDT, currentQuantity: '100' },
    { assetType: 'token', assetAddress: BTCB, currentQuantity: '0' },
    { assetType: 'native', assetSymbol: 'BNB', currentQuantity: '1' },
  ];
}

function plan(): AgenticWalletMarketSwapAccountingMutationPlan {
  return {
    scope: 'agentic_wallet_market_swap_accounting_mutation_plan',
    accountingEvidenceId: ACCOUNTING_EVIDENCE_ID,
    completionEvidenceId: FINANCIAL_EVIDENCE_ID,
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

function identity(
  value:
    | AgenticWalletMarketSwapLocalAccountingBalance
    | AgenticWalletMarketSwapBalanceChange,
): string {
  return value.assetType === 'token'
    ? `token:${value.assetAddress}`
    : `native:${value.assetSymbol}`;
}
