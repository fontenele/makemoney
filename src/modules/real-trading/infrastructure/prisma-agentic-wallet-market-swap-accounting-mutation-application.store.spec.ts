import { jest } from '@jest/globals';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AgenticWalletMarketSwapBalanceChange } from './agentic-wallet-market-swap-accounting-balance-evidence';
import {
  ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT,
  AgenticWalletMarketSwapAccountingMutationApplication,
  prepareAgenticWalletMarketSwapAccountingMutationApplication,
} from './agentic-wallet-market-swap-accounting-mutation-application';
import {
  AgenticWalletMarketSwapAccountingLedgerMismatchError,
  AgenticWalletMarketSwapAccountingMutationApplicationBlockedError,
  AgenticWalletMarketSwapAccountingMutationApplicationConflictError,
  AgenticWalletMarketSwapAccountingMutationAuthorizationNotFoundError,
} from './agentic-wallet-market-swap-accounting-mutation-application.store';
import {
  ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
  authorizeAgenticWalletMarketSwapAccountingMutation,
} from './agentic-wallet-market-swap-accounting-mutation-authorization';
import { prepareAgenticWalletMarketSwapAccountingMutationCommitment } from './agentic-wallet-market-swap-accounting-mutation-commitment';
import { AgenticWalletMarketSwapAccountingMutationPlan } from './agentic-wallet-market-swap-accounting-mutation-plan';
import { PrismaAgenticWalletMarketSwapAccountingMutationApplicationStore } from './prisma-agentic-wallet-market-swap-accounting-mutation-application.store';

const APPLICATION_ID = '10101010-1010-4010-8010-101010101010';
const AUTHORIZATION_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const MUTATION_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const ACCOUNTING_EVIDENCE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const FINANCIAL_EVIDENCE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const STATUS_OBSERVATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const OBSERVED_AT = new Date('2026-10-03T12:00:09.000Z');
const EVIDENCE_RECORDED_AT = new Date('2026-10-03T12:00:10.000Z');
const COMMITMENT_PREPARED_AT = new Date('2026-10-03T12:00:11.000Z');
const COMMITMENT_RECORDED_AT = new Date('2026-10-03T12:00:12.000Z');
const AUTHORIZED_AT = new Date('2026-10-03T12:00:13.000Z');
const AUTHORIZATION_RECORDED_AT = new Date('2026-10-03T12:00:14.000Z');
const BALANCES_OBSERVED_AT = new Date('2026-10-03T12:00:15.000Z');
const APPLICATION_PREPARED_AT = new Date('2026-10-03T12:00:16.000Z');
const APPLIED_AT = new Date('2026-10-03T12:00:17.000Z');

describe('PrismaAgenticWalletMarketSwapAccountingMutationApplicationStore', () => {
  it('atomically applies every authorized transition once', async () => {
    const harness = repositoryHarness();
    const value = application();

    await expect(harness.store.apply(value)).resolves.toMatchObject({
      replayed: false,
      applied: {
        application: value,
        appliedAt: APPLIED_AT,
        accountingMutationComplete: true,
        submissionRetryAllowed: false,
      },
    });
    expect(harness.authorizationFindUnique).toHaveBeenCalledTimes(1);
    expect(harness.updateMany).toHaveBeenCalledTimes(3);
    expect([...harness.quantities.entries()].sort()).toEqual(
      [
        [`native:BNB`, '0.9997'],
        [`token:${BTCB}`, '0.000071'],
        [`token:${USDT}`, '94.995'],
      ].sort(),
    );
    expect(harness.create.mock.calls[0][0].data).toMatchObject({
      id: APPLICATION_ID,
      authorizationId: AUTHORIZATION_ID,
      accountingMutationCommitmentId: MUTATION_ID,
      gateId: GATE_ID,
      appliedAt: APPLIED_AT,
    });
    expect(harness.prismaTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('replays the immutable receipt without touching balances again', async () => {
    const harness = repositoryHarness();
    const value = application();
    const first = await harness.store.apply(value);
    harness.existingFindFirst.mockResolvedValue(
      applicationRow(harness.create.mock.calls[0][0].data),
    );
    harness.updateMany.mockClear();
    harness.authorizationFindUnique.mockClear();

    await expect(harness.store.apply(value)).resolves.toEqual({
      applied: first.applied,
      replayed: true,
    });
    expect(harness.updateMany).not.toHaveBeenCalled();
    expect(harness.authorizationFindUnique).not.toHaveBeenCalled();
  });

  it('rejects divergent reuse of an already applied correlation identity', async () => {
    const harness = repositoryHarness();
    harness.existingFindFirst.mockResolvedValue(
      applicationRow({ requestFingerprint: 'f'.repeat(64) }),
    );

    await expect(harness.store.apply(application())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingMutationApplicationConflictError,
    );
    expect(harness.updateMany).not.toHaveBeenCalled();
  });

  it('rejects malformed application before persistence access', async () => {
    const harness = repositoryHarness();
    const malformed = {
      ...application(),
      accountingMutationComplete: true,
    } as unknown as AgenticWalletMarketSwapAccountingMutationApplication;

    await expect(harness.store.apply(malformed)).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingMutationApplicationBlockedError,
    );
    expect(harness.prismaTransaction).not.toHaveBeenCalled();
  });

  it('rejects an absent durable authorization', async () => {
    const harness = repositoryHarness();
    harness.authorizationFindUnique.mockResolvedValue(null);

    await expect(harness.store.apply(application())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingMutationAuthorizationNotFoundError,
    );
    expect(harness.updateMany).not.toHaveBeenCalled();
  });

  it('rejects missing or changed current ledger balances before mutation', async () => {
    const harness = repositoryHarness();
    harness.balanceFindMany.mockResolvedValue(
      balanceRows().filter((row) => row.assetIdentity !== `token:${BTCB}`),
    );

    await expect(harness.store.apply(application())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingLedgerMismatchError,
    );
    expect(harness.updateMany).not.toHaveBeenCalled();
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects a conditional balance update that loses the expected-before race', async () => {
    const harness = repositoryHarness();
    harness.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(harness.store.apply(application())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingLedgerMismatchError,
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects application time before preparation', async () => {
    const harness = repositoryHarness(new Date('2026-10-03T12:00:15.999Z'));

    await expect(harness.store.apply(application())).rejects.toThrow(
      'Accounting mutation application time is invalid',
    );
    expect(harness.updateMany).not.toHaveBeenCalled();
  });
});

function repositoryHarness(appliedAt = APPLIED_AT) {
  const quantities = new Map(
    balanceRows().map((row) => [row.assetIdentity, row.quantity]),
  );
  const existingFindFirst = jest
    .fn<() => Promise<ApplicationRow | null>>()
    .mockResolvedValue(null);
  const authorizationFindUnique = jest
    .fn<() => Promise<AuthorizationRow | null>>()
    .mockResolvedValue(authorizationRow());
  const balanceFindMany = jest
    .fn<() => Promise<ReturnType<typeof balanceRows>>>()
    .mockResolvedValue(balanceRows());
  const updateMany = jest.fn(
    ({
      where,
      data,
    }: {
      where: { assetIdentity: string };
      data: { quantity: string };
    }) => {
      quantities.set(where.assetIdentity, data.quantity);
      return Promise.resolve({ count: 1 });
    },
  );
  const create = jest.fn(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(applicationRow(data)),
  );
  const tx = {
    $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    realExecutionAccountingMutationApplication: {
      findFirst: existingFindFirst,
      create,
    },
    realExecutionAccountingMutationAuthorization: {
      findUnique: authorizationFindUnique,
    },
    realExecutionAccountingBalance: {
      findMany: balanceFindMany,
      updateMany,
    },
  };
  const prismaTransaction = jest.fn(
    async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  );
  const prisma = {
    $transaction: prismaTransaction,
  } as unknown as PrismaService;
  return {
    authorizationFindUnique,
    balanceFindMany,
    create,
    existingFindFirst,
    prismaTransaction,
    quantities,
    updateMany,
    store: new PrismaAgenticWalletMarketSwapAccountingMutationApplicationStore(
      prisma,
      () => appliedAt,
    ),
  };
}

function application(): AgenticWalletMarketSwapAccountingMutationApplication {
  const stored = storedAuthorization();
  const assessment =
    prepareAgenticWalletMarketSwapAccountingMutationApplication(stored, {
      applicationId: APPLICATION_ID,
      authorizationId: AUTHORIZATION_ID,
      mutationId: MUTATION_ID,
      planFingerprint:
        stored.authorization.commitment.commitment.planFingerprint,
      gateId: GATE_ID,
      transactionHash: TRANSACTION_HASH,
      acknowledgment: ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT,
      currentBalances: balanceRows().map((row) =>
        row.assetType === 'token'
          ? {
              assetType: 'token' as const,
              assetAddress: row.assetAddress!,
              currentQuantity: row.quantity,
            }
          : {
              assetType: 'native' as const,
              assetSymbol: 'BNB' as const,
              currentQuantity: row.quantity,
            },
      ),
      balanceCoverageComplete: true,
      balancesObservedAt: BALANCES_OBSERVED_AT,
      preparedAt: APPLICATION_PREPARED_AT,
    });
  if (assessment.application === null) throw new Error('Application blocked');
  return assessment.application;
}

function storedAuthorization() {
  const commitmentAssessment =
    prepareAgenticWalletMarketSwapAccountingMutationCommitment(
      plan(),
      MUTATION_ID,
      COMMITMENT_PREPARED_AT,
    );
  if (commitmentAssessment.commitment === null)
    throw new Error('Commitment blocked');
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
    throw new Error('Authorization blocked');
  return {
    authorization: authorizationAssessment.authorization,
    recordedAt: AUTHORIZATION_RECORDED_AT,
  };
}

function plan(): AgenticWalletMarketSwapAccountingMutationPlan {
  return {
    scope: 'agentic_wallet_market_swap_accounting_mutation_plan',
    accountingEvidenceId: ACCOUNTING_EVIDENCE_ID,
    completionEvidenceId: FINANCIAL_EVIDENCE_ID,
    gateId: GATE_ID,
    transactionHash: TRANSACTION_HASH,
    balanceTransitions: transitions(),
    evidenceObservedAt: OBSERVED_AT,
    evidenceRecordedAt: EVIDENCE_RECORDED_AT,
    financialReconciliationComplete: true,
    accountingMutationRequired: true,
    accountingMutationAuthorized: false,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
  };
}

function transitions(): AgenticWalletMarketSwapBalanceChange[] {
  return [
    {
      assetType: 'token',
      assetAddress: USDT,
      direction: 'debit',
      beforeQuantity: '100',
      afterQuantity: '94.995',
      deltaQuantity: '5.005',
    },
    {
      assetType: 'token',
      assetAddress: BTCB,
      direction: 'credit',
      beforeQuantity: '0',
      afterQuantity: '0.000071',
      deltaQuantity: '0.000071',
    },
    {
      assetType: 'native',
      assetSymbol: 'BNB',
      direction: 'debit',
      beforeQuantity: '1',
      afterQuantity: '0.9997',
      deltaQuantity: '0.0003',
    },
  ];
}

function balanceRows() {
  return [
    {
      assetIdentity: `token:${USDT}`,
      assetType: 'token',
      assetAddress: USDT,
      assetSymbol: null,
      quantity: '100',
      updatedAt: OBSERVED_AT,
    },
    {
      assetIdentity: `token:${BTCB}`,
      assetType: 'token',
      assetAddress: BTCB,
      assetSymbol: null,
      quantity: '0',
      updatedAt: OBSERVED_AT,
    },
    {
      assetIdentity: 'native:BNB',
      assetType: 'native',
      assetAddress: null,
      assetSymbol: 'BNB',
      quantity: '1',
      updatedAt: OBSERVED_AT,
    },
  ];
}

function financialRow() {
  return {
    id: FINANCIAL_EVIDENCE_ID,
    gateId: GATE_ID,
    statusObservationId: STATUS_OBSERVATION_ID,
    providerId: 'agentic_wallet',
    providerOrderId: '1234567890',
    chainId: '56',
    transactionHash: TRANSACTION_HASH,
    sourceTokenAddress: USDT,
    targetTokenAddress: BTCB,
    submittedSourceQuantity: '5',
    actualTargetReceivedQuantity: '0.000071',
    providerFeeComponents: [{ assetAddress: USDT, quantity: '0.005' }],
    networkFeeAsset: 'BNB',
    networkFeeQuantity: '0.0003',
    requestFingerprint: 'a'.repeat(64),
    observedAt: new Date('2026-10-03T12:00:07.000Z'),
    recordedAt: new Date('2026-10-03T12:00:08.000Z'),
  };
}

function accountingRow() {
  return {
    id: ACCOUNTING_EVIDENCE_ID,
    financialReconciliationEvidenceId: FINANCIAL_EVIDENCE_ID,
    gateId: GATE_ID,
    transactionHash: TRANSACTION_HASH,
    balanceChanges: transitions(),
    requestFingerprint: 'b'.repeat(64),
    observedAt: OBSERVED_AT,
    recordedAt: EVIDENCE_RECORDED_AT,
    financialReconciliationEvidence: financialRow(),
  };
}

function commitmentRow() {
  const value = storedAuthorization().authorization.commitment.commitment;
  return {
    id: MUTATION_ID,
    accountingBalanceEvidenceId: ACCOUNTING_EVIDENCE_ID,
    financialReconciliationEvidenceId: FINANCIAL_EVIDENCE_ID,
    gateId: GATE_ID,
    transactionHash: TRANSACTION_HASH,
    planFingerprint: value.planFingerprint,
    balanceTransitions: value.plan.balanceTransitions,
    evidenceObservedAt: OBSERVED_AT,
    evidenceRecordedAt: EVIDENCE_RECORDED_AT,
    preparedAt: COMMITMENT_PREPARED_AT,
    requestFingerprint: 'c'.repeat(64),
    recordedAt: COMMITMENT_RECORDED_AT,
    accountingBalanceEvidence: accountingRow(),
  };
}

function authorizationRow() {
  const value = storedAuthorization().authorization;
  return {
    id: AUTHORIZATION_ID,
    accountingMutationCommitmentId: MUTATION_ID,
    accountingBalanceEvidenceId: ACCOUNTING_EVIDENCE_ID,
    financialReconciliationEvidenceId: FINANCIAL_EVIDENCE_ID,
    gateId: GATE_ID,
    transactionHash: TRANSACTION_HASH,
    planFingerprint: value.commitment.commitment.planFingerprint,
    acknowledgment: ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
    authorizedAt: AUTHORIZED_AT,
    requestFingerprint: 'd'.repeat(64),
    recordedAt: AUTHORIZATION_RECORDED_AT,
    accountingMutationCommitment: commitmentRow(),
  };
}

function applicationRow(overrides: Record<string, unknown> = {}) {
  const value = application();
  return {
    id: APPLICATION_ID,
    authorizationId: AUTHORIZATION_ID,
    accountingMutationCommitmentId: MUTATION_ID,
    accountingBalanceEvidenceId: ACCOUNTING_EVIDENCE_ID,
    financialReconciliationEvidenceId: FINANCIAL_EVIDENCE_ID,
    gateId: GATE_ID,
    transactionHash: TRANSACTION_HASH,
    planFingerprint: value.planFingerprint,
    acknowledgment: ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT,
    currentBalances: value.currentBalances,
    balanceTransitions: value.balanceTransitions,
    authorizationRecordedAt: AUTHORIZATION_RECORDED_AT,
    balancesObservedAt: BALANCES_OBSERVED_AT,
    preparedAt: APPLICATION_PREPARED_AT,
    requestFingerprint: '0'.repeat(64),
    appliedAt: APPLIED_AT,
    accountingMutationAuthorization: authorizationRow(),
    ...overrides,
  };
}

type AuthorizationRow = ReturnType<typeof authorizationRow>;
type ApplicationRow = ReturnType<typeof applicationRow>;
