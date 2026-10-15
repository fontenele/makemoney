import { jest } from '@jest/globals';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AgenticWalletMarketSwapBalanceChange } from './agentic-wallet-market-swap-accounting-balance-evidence';
import {
  AgenticWalletMarketSwapAccountingMutationCommitment,
  prepareAgenticWalletMarketSwapAccountingMutationCommitment,
} from './agentic-wallet-market-swap-accounting-mutation-commitment';
import {
  AgenticWalletMarketSwapAccountingMutationCommitmentBlockedError,
  AgenticWalletMarketSwapAccountingMutationCommitmentConflictError,
  AgenticWalletMarketSwapAccountingMutationEvidenceNotFoundError,
} from './agentic-wallet-market-swap-accounting-mutation-commitment.store';
import { AgenticWalletMarketSwapAccountingMutationPlan } from './agentic-wallet-market-swap-accounting-mutation-plan';
import { PrismaAgenticWalletMarketSwapAccountingMutationCommitmentStore } from './prisma-agentic-wallet-market-swap-accounting-mutation-commitment.store';

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
const RECORDED_AT = new Date('2026-10-03T12:00:12.000Z');

describe('PrismaAgenticWalletMarketSwapAccountingMutationCommitmentStore', () => {
  it('persists a commitment only after revalidating durable accounting evidence', async () => {
    const harness = repositoryHarness();
    const value = commitment();

    await expect(harness.store.record(value)).resolves.toMatchObject({
      stored: {
        commitment: value,
        recordedAt: RECORDED_AT,
      },
      replayed: false,
    });
    expect(harness.accountingFindUnique).toHaveBeenCalledWith({
      where: { id: ACCOUNTING_EVIDENCE_ID },
      include: { financialReconciliationEvidence: true },
    });
    expect(harness.create.mock.calls[0][0].data).toMatchObject({
      id: MUTATION_ID,
      accountingBalanceEvidenceId: ACCOUNTING_EVIDENCE_ID,
      financialReconciliationEvidenceId: FINANCIAL_EVIDENCE_ID,
      gateId: GATE_ID,
      transactionHash: TRANSACTION_HASH,
      planFingerprint: value.planFingerprint,
      preparedAt: PREPARED_AT,
      recordedAt: RECORDED_AT,
    });
    expect(harness.create.mock.calls[0][0].data.requestFingerprint).toMatch(
      /^[0-9a-f]{64}$/,
    );
    expect(harness.prismaTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('replays the exact immutable commitment without reloading evidence', async () => {
    const harness = repositoryHarness();
    const value = commitment();
    await harness.store.record(value);
    const firstCreate = harness.create.mock.calls[0][0].data;
    harness.existingFindUnique.mockResolvedValue(commitmentRow(firstCreate));
    harness.create.mockClear();
    harness.accountingFindUnique.mockClear();

    await expect(harness.store.record(value)).resolves.toMatchObject({
      stored: { commitment: { mutationId: MUTATION_ID } },
      replayed: true,
    });
    expect(harness.create).not.toHaveBeenCalled();
    expect(harness.accountingFindUnique).not.toHaveBeenCalled();
  });

  it('rejects divergent reuse of the same accounting evidence', async () => {
    const harness = repositoryHarness();
    harness.existingFindUnique.mockResolvedValue(
      commitmentRow({ requestFingerprint: 'f'.repeat(64) }),
    );

    await expect(harness.store.record(commitment())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingMutationCommitmentConflictError,
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects an invalid commitment before persistence access', async () => {
    const harness = repositoryHarness();
    const malformed = {
      ...commitment(),
      planFingerprint: 'f'.repeat(64),
    };

    await expect(harness.store.record(malformed)).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingMutationCommitmentBlockedError,
    );
    expect(harness.prismaTransaction).not.toHaveBeenCalled();
  });

  it('rejects absent durable accounting evidence', async () => {
    const harness = repositoryHarness();
    harness.accountingFindUnique.mockResolvedValue(null);

    await expect(harness.store.record(commitment())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingMutationEvidenceNotFoundError,
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects a structurally valid plan that differs from durable evidence', async () => {
    const harness = repositoryHarness();
    const divergent = commitment(
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
    );

    await expect(harness.store.record(divergent)).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingMutationCommitmentBlockedError,
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects malformed related durable financial evidence', async () => {
    const harness = repositoryHarness();
    harness.accountingFindUnique.mockResolvedValue(
      accountingRow({}, { actualTargetReceivedQuantity: '0' }),
    );

    await expect(harness.store.record(commitment())).rejects.toThrow(
      'Persisted financial reconciliation evidence is invalid',
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects recording time before commitment preparation', async () => {
    const harness = repositoryHarness(new Date('2026-10-03T12:00:10.999Z'));

    await expect(harness.store.record(commitment())).rejects.toThrow(
      'Accounting mutation commitment recording metadata is invalid',
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects malformed persisted commitment during replay', async () => {
    const harness = repositoryHarness();
    const value = commitment();
    await harness.store.record(value);
    const firstCreate = harness.create.mock.calls[0][0].data;
    harness.existingFindUnique.mockResolvedValue(
      commitmentRow({
        ...firstCreate,
        balanceTransitions: [],
      }),
    );

    await expect(harness.store.record(value)).rejects.toThrow(
      'Persisted accounting mutation commitment is invalid',
    );
  });
});

function repositoryHarness(recordedAt = RECORDED_AT) {
  const existingFindUnique = jest
    .fn<() => Promise<CommitmentRow | null>>()
    .mockResolvedValue(null);
  const accountingFindUnique = jest
    .fn<() => Promise<AccountingRow | null>>()
    .mockResolvedValue(accountingRow());
  const create = jest.fn(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(commitmentRow(data)),
  );
  const tx = {
    $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    realExecutionAccountingMutationCommitment: {
      findUnique: existingFindUnique,
      create,
    },
    realExecutionAccountingBalanceEvidence: {
      findUnique: accountingFindUnique,
    },
  };
  const prismaTransaction = jest.fn(
    async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  );
  const prisma = {
    $transaction: prismaTransaction,
  } as unknown as PrismaService;
  return {
    accountingFindUnique,
    create,
    existingFindUnique,
    prismaTransaction,
    store: new PrismaAgenticWalletMarketSwapAccountingMutationCommitmentStore(
      prisma,
      () => recordedAt,
    ),
  };
}

function commitment(
  value = plan(),
): AgenticWalletMarketSwapAccountingMutationCommitment {
  const assessment = prepareAgenticWalletMarketSwapAccountingMutationCommitment(
    value,
    MUTATION_ID,
    PREPARED_AT,
  );
  if (assessment.commitment === null)
    throw new Error('Test commitment is blocked');
  return assessment.commitment;
}

function plan(
  overrides: Partial<AgenticWalletMarketSwapAccountingMutationPlan> = {},
): AgenticWalletMarketSwapAccountingMutationPlan {
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
    ...overrides,
  };
}

function balanceTransitions(): AgenticWalletMarketSwapBalanceChange[] {
  return [tokenDebit(), tokenCredit(), nativeDebit()];
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

function accountingRow(
  overrides: Record<string, unknown> = {},
  financialOverrides: Record<string, unknown> = {},
) {
  return {
    id: ACCOUNTING_EVIDENCE_ID,
    financialReconciliationEvidenceId: FINANCIAL_EVIDENCE_ID,
    gateId: GATE_ID,
    transactionHash: TRANSACTION_HASH,
    balanceChanges: balanceTransitions(),
    requestFingerprint: 'b'.repeat(64),
    observedAt: OBSERVED_AT,
    recordedAt: EVIDENCE_RECORDED_AT,
    financialReconciliationEvidence: financialRow(financialOverrides),
    ...overrides,
  };
}

function financialRow(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  };
}

function commitmentRow(overrides: Record<string, unknown> = {}) {
  const value = commitment();
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
    recordedAt: RECORDED_AT,
    ...overrides,
  };
}

type AccountingRow = ReturnType<typeof accountingRow>;
type CommitmentRow = ReturnType<typeof commitmentRow>;
