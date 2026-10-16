import { jest } from '@jest/globals';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AgenticWalletMarketSwapBalanceChange } from './agentic-wallet-market-swap-accounting-balance-evidence';
import {
  ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
  AgenticWalletMarketSwapAccountingMutationAuthorization,
  authorizeAgenticWalletMarketSwapAccountingMutation,
} from './agentic-wallet-market-swap-accounting-mutation-authorization';
import {
  AgenticWalletMarketSwapAccountingMutationAuthorizationBlockedError,
  AgenticWalletMarketSwapAccountingMutationAuthorizationConflictError,
  AgenticWalletMarketSwapAccountingMutationCommitmentNotFoundError,
} from './agentic-wallet-market-swap-accounting-mutation-authorization.store';
import { prepareAgenticWalletMarketSwapAccountingMutationCommitment } from './agentic-wallet-market-swap-accounting-mutation-commitment';
import { AgenticWalletMarketSwapAccountingMutationPlan } from './agentic-wallet-market-swap-accounting-mutation-plan';
import { PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationStore } from './prisma-agentic-wallet-market-swap-accounting-mutation-authorization.store';

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
const PREPARED_AT = new Date('2026-10-03T12:00:11.000Z');
const COMMITMENT_RECORDED_AT = new Date('2026-10-03T12:00:12.000Z');
const AUTHORIZED_AT = new Date('2026-10-03T12:00:13.000Z');
const AUTHORIZATION_RECORDED_AT = new Date('2026-10-03T12:00:14.000Z');

describe('PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationStore', () => {
  it('persists authorization only after revalidating the durable commitment', async () => {
    const harness = repositoryHarness();
    const value = authorization();

    await expect(harness.store.record(value)).resolves.toMatchObject({
      stored: {
        authorization: value,
        recordedAt: AUTHORIZATION_RECORDED_AT,
      },
      replayed: false,
    });
    expect(harness.commitmentFindUnique).toHaveBeenCalledWith({
      where: { id: MUTATION_ID },
      include: {
        accountingBalanceEvidence: {
          include: { financialReconciliationEvidence: true },
        },
      },
    });
    expect(harness.create.mock.calls[0][0].data).toMatchObject({
      id: AUTHORIZATION_ID,
      accountingMutationCommitmentId: MUTATION_ID,
      accountingBalanceEvidenceId: ACCOUNTING_EVIDENCE_ID,
      financialReconciliationEvidenceId: FINANCIAL_EVIDENCE_ID,
      gateId: GATE_ID,
      transactionHash: TRANSACTION_HASH,
      planFingerprint: value.commitment.commitment.planFingerprint,
      acknowledgment: ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
      authorizedAt: AUTHORIZED_AT,
      recordedAt: AUTHORIZATION_RECORDED_AT,
    });
    expect(harness.create.mock.calls[0][0].data.requestFingerprint).toMatch(
      /^[0-9a-f]{64}$/,
    );
    expect(harness.prismaTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('replays the exact immutable authorization', async () => {
    const harness = repositoryHarness();
    const value = authorization();
    await harness.store.record(value);
    const firstCreate = harness.create.mock.calls[0][0].data;
    harness.existingFindUnique.mockResolvedValue(authorizationRow(firstCreate));
    harness.create.mockClear();
    harness.commitmentFindUnique.mockClear();

    await expect(harness.store.record(value)).resolves.toMatchObject({
      stored: { authorization: { authorizationId: AUTHORIZATION_ID } },
      replayed: true,
    });
    expect(harness.create).not.toHaveBeenCalled();
    expect(harness.commitmentFindUnique).not.toHaveBeenCalled();
  });

  it('rejects divergent reuse of the same commitment', async () => {
    const harness = repositoryHarness();
    harness.existingFindUnique.mockResolvedValue(
      authorizationRow({ requestFingerprint: 'f'.repeat(64) }),
    );

    await expect(harness.store.record(authorization())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingMutationAuthorizationConflictError,
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects malformed authorization before persistence access', async () => {
    const harness = repositoryHarness();
    const malformed = {
      ...authorization(),
      accountingMutationComplete: true,
    } as unknown as AgenticWalletMarketSwapAccountingMutationAuthorization;

    await expect(harness.store.record(malformed)).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingMutationAuthorizationBlockedError,
    );
    expect(harness.prismaTransaction).not.toHaveBeenCalled();
  });

  it('rejects an absent durable commitment', async () => {
    const harness = repositoryHarness();
    harness.commitmentFindUnique.mockResolvedValue(null);

    await expect(harness.store.record(authorization())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingMutationCommitmentNotFoundError,
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects durable commitment content that differs from authorization', async () => {
    const harness = repositoryHarness();
    harness.commitmentFindUnique.mockResolvedValue(
      commitmentRow({ planFingerprint: 'f'.repeat(64) }),
    );

    await expect(harness.store.record(authorization())).rejects.toThrow(
      'Persisted accounting mutation commitment is invalid',
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects recording time before authorization', async () => {
    const harness = repositoryHarness(new Date('2026-10-03T12:00:12.999Z'));

    await expect(harness.store.record(authorization())).rejects.toThrow(
      'Accounting mutation authorization recording metadata is invalid',
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects malformed persisted authorization during replay', async () => {
    const harness = repositoryHarness();
    const value = authorization();
    await harness.store.record(value);
    const firstCreate = harness.create.mock.calls[0][0].data;
    harness.existingFindUnique.mockResolvedValue(
      authorizationRow({
        ...firstCreate,
        acknowledgment: 'invalid',
      }),
    );

    await expect(harness.store.record(value)).rejects.toThrow(
      'Persisted accounting mutation authorization is invalid',
    );
  });
});

function repositoryHarness(recordedAt = AUTHORIZATION_RECORDED_AT) {
  const existingFindUnique = jest
    .fn<() => Promise<AuthorizationRow | null>>()
    .mockResolvedValue(null);
  const commitmentFindUnique = jest
    .fn<() => Promise<CommitmentRow | null>>()
    .mockResolvedValue(commitmentRow());
  const create = jest.fn(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(authorizationRow(data)),
  );
  const tx = {
    $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    realExecutionAccountingMutationAuthorization: {
      findUnique: existingFindUnique,
      create,
    },
    realExecutionAccountingMutationCommitment: {
      findUnique: commitmentFindUnique,
    },
  };
  const prismaTransaction = jest.fn(
    async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  );
  const prisma = {
    $transaction: prismaTransaction,
  } as unknown as PrismaService;
  return {
    commitmentFindUnique,
    create,
    existingFindUnique,
    prismaTransaction,
    store:
      new PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationStore(
        prisma,
        () => recordedAt,
      ),
  };
}

function authorization(): AgenticWalletMarketSwapAccountingMutationAuthorization {
  const commitmentAssessment =
    prepareAgenticWalletMarketSwapAccountingMutationCommitment(
      plan(),
      MUTATION_ID,
      PREPARED_AT,
    );
  if (commitmentAssessment.commitment === null)
    throw new Error('Test commitment is blocked');
  const assessment = authorizeAgenticWalletMarketSwapAccountingMutation(
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
  if (assessment.authorization === null)
    throw new Error('Test authorization is blocked');
  return assessment.authorization;
}

function plan(): AgenticWalletMarketSwapAccountingMutationPlan {
  return {
    scope: 'agentic_wallet_market_swap_accounting_mutation_plan',
    accountingEvidenceId: ACCOUNTING_EVIDENCE_ID,
    completionEvidenceId: FINANCIAL_EVIDENCE_ID,
    gateId: GATE_ID,
    transactionHash: TRANSACTION_HASH,
    balanceTransitions: balanceTransitions(),
    evidenceObservedAt: OBSERVED_AT,
    evidenceRecordedAt: EVIDENCE_RECORDED_AT,
    financialReconciliationComplete: true,
    accountingMutationRequired: true,
    accountingMutationAuthorized: false,
    accountingMutationComplete: false,
    submissionRetryAllowed: false,
  };
}

function balanceTransitions(): AgenticWalletMarketSwapBalanceChange[] {
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
    balanceChanges: balanceTransitions(),
    requestFingerprint: 'b'.repeat(64),
    observedAt: OBSERVED_AT,
    recordedAt: EVIDENCE_RECORDED_AT,
    financialReconciliationEvidence: financialRow(),
  };
}

function commitmentRow(overrides: Record<string, unknown> = {}) {
  const value = authorization().commitment.commitment;
  return {
    id: value.mutationId,
    accountingBalanceEvidenceId: value.plan.accountingEvidenceId,
    financialReconciliationEvidenceId: value.plan.completionEvidenceId,
    gateId: value.plan.gateId,
    transactionHash: value.plan.transactionHash,
    planFingerprint: value.planFingerprint,
    balanceTransitions: value.plan.balanceTransitions,
    evidenceObservedAt: value.plan.evidenceObservedAt,
    evidenceRecordedAt: value.plan.evidenceRecordedAt,
    preparedAt: value.preparedAt,
    requestFingerprint: 'c'.repeat(64),
    recordedAt: COMMITMENT_RECORDED_AT,
    accountingBalanceEvidence: accountingRow(),
    ...overrides,
  };
}

function authorizationRow(overrides: Record<string, unknown> = {}) {
  const value = authorization();
  return {
    id: value.authorizationId,
    accountingMutationCommitmentId: value.commitment.commitment.mutationId,
    accountingBalanceEvidenceId:
      value.commitment.commitment.plan.accountingEvidenceId,
    financialReconciliationEvidenceId:
      value.commitment.commitment.plan.completionEvidenceId,
    gateId: value.commitment.commitment.plan.gateId,
    transactionHash: value.commitment.commitment.plan.transactionHash,
    planFingerprint: value.commitment.commitment.planFingerprint,
    acknowledgment: value.acknowledgment,
    authorizedAt: value.authorizedAt,
    requestFingerprint: 'd'.repeat(64),
    recordedAt: AUTHORIZATION_RECORDED_AT,
    accountingMutationCommitment: commitmentRow(),
    ...overrides,
  };
}

type CommitmentRow = ReturnType<typeof commitmentRow>;
type AuthorizationRow = ReturnType<typeof authorizationRow>;
