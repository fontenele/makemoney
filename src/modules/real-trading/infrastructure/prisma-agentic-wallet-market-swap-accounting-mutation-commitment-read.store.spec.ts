import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { prepareAgenticWalletMarketSwapAccountingMutationCommitment } from './agentic-wallet-market-swap-accounting-mutation-commitment';
import { AgenticWalletMarketSwapAccountingMutationCommitmentIdentityError } from './agentic-wallet-market-swap-accounting-mutation-commitment.store';
import { AgenticWalletMarketSwapAccountingMutationPlan } from './agentic-wallet-market-swap-accounting-mutation-plan';
import { PrismaAgenticWalletMarketSwapAccountingMutationCommitmentReadStore } from './prisma-agentic-wallet-market-swap-accounting-mutation-commitment-read.store';

const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_GATE_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const STATUS_OBSERVATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const FINANCIAL_EVIDENCE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ACCOUNTING_EVIDENCE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const MUTATION_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const OBSERVED_AT = new Date('2026-10-03T12:00:09.000Z');
const EVIDENCE_RECORDED_AT = new Date('2026-10-03T12:00:10.000Z');
const PREPARED_AT = new Date('2026-10-03T12:00:11.000Z');
const RECORDED_AT = new Date('2026-10-03T12:00:12.000Z');
const PLAN_FINGERPRINT = planFingerprint();

describe('PrismaAgenticWalletMarketSwapAccountingMutationCommitmentReadStore', () => {
  it('rejects an invalid gate identity before database access', async () => {
    const harness = repositoryHarness();

    await expect(
      harness.store.getByGateId('not-a-uuid'),
    ).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingMutationCommitmentIdentityError,
    );
    expect(harness.findUnique).not.toHaveBeenCalled();
  });

  it('returns null when no durable commitment exists', async () => {
    const harness = repositoryHarness(null);

    await expect(harness.store.getByGateId(GATE_ID)).resolves.toBeNull();
    expect(harness.findUnique).toHaveBeenCalledWith({
      where: { gateId: GATE_ID },
      include: {
        accountingBalanceEvidence: {
          include: { financialReconciliationEvidence: true },
        },
      },
    });
  });

  it('loads, revalidates, and defensively returns the durable commitment', async () => {
    const row = commitmentRow();
    const harness = repositoryHarness(row);

    const stored = await harness.store.getByGateId(GATE_ID);

    expect(stored).toMatchObject({
      commitment: {
        scope: 'agentic_wallet_market_swap_accounting_mutation_commitment',
        mutationId: MUTATION_ID,
        planFingerprint: PLAN_FINGERPRINT,
        plan: {
          accountingEvidenceId: ACCOUNTING_EVIDENCE_ID,
          completionEvidenceId: FINANCIAL_EVIDENCE_ID,
          gateId: GATE_ID,
          transactionHash: TRANSACTION_HASH,
          accountingMutationAuthorized: false,
          accountingMutationComplete: false,
        },
      },
      recordedAt: RECORDED_AT,
    });
    expect(stored!.commitment.plan.balanceTransitions).not.toBe(
      row.balanceTransitions,
    );
    expect(stored!.commitment.preparedAt).not.toBe(row.preparedAt);
    expect(stored!.recordedAt).not.toBe(row.recordedAt);
  });

  it('rejects related evidence that contradicts the requested gate', async () => {
    const harness = repositoryHarness(
      commitmentRow({}, { gateId: OTHER_GATE_ID }, { gateId: OTHER_GATE_ID }),
    );

    await expect(harness.store.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted accounting balance evidence is inconsistent',
    );
  });

  it('rejects a commitment linked to different accounting evidence', async () => {
    const harness = repositoryHarness(
      commitmentRow({}, { id: '11111111-1111-4111-8111-111111111111' }),
    );

    await expect(harness.store.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted accounting mutation commitment is inconsistent',
    );
  });

  it.each([
    commitmentRow({ balanceTransitions: [] }),
    commitmentRow({}, {}, { actualTargetReceivedQuantity: '0' }),
  ])('rejects malformed durable data %#', async (row) => {
    const harness = repositoryHarness(row);

    await expect(harness.store.getByGateId(GATE_ID)).rejects.toThrow(
      /Persisted (accounting mutation commitment|financial reconciliation evidence) is invalid/,
    );
  });
});

function repositoryHarness(row: CommitmentRow | null = commitmentRow()) {
  const findUnique = jest
    .fn<() => Promise<CommitmentRow | null>>()
    .mockResolvedValue(row);
  const prisma = {
    realExecutionAccountingMutationCommitment: { findUnique },
  } as unknown as PrismaService;
  return {
    findUnique,
    store:
      new PrismaAgenticWalletMarketSwapAccountingMutationCommitmentReadStore(
        prisma,
      ),
  };
}

function commitmentRow(
  overrides: Record<string, unknown> = {},
  accountingOverrides: Record<string, unknown> = {},
  financialOverrides: Record<string, unknown> = {},
) {
  return {
    id: MUTATION_ID,
    accountingBalanceEvidenceId: ACCOUNTING_EVIDENCE_ID,
    financialReconciliationEvidenceId: FINANCIAL_EVIDENCE_ID,
    gateId: GATE_ID,
    transactionHash: TRANSACTION_HASH,
    planFingerprint: PLAN_FINGERPRINT,
    balanceTransitions: canonicalBalanceChanges(),
    evidenceObservedAt: OBSERVED_AT,
    evidenceRecordedAt: EVIDENCE_RECORDED_AT,
    preparedAt: PREPARED_AT,
    requestFingerprint: 'c'.repeat(64),
    recordedAt: RECORDED_AT,
    accountingBalanceEvidence: accountingRow(
      accountingOverrides,
      financialOverrides,
    ),
    ...overrides,
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
    balanceChanges: balanceChanges(),
    requestFingerprint: 'b'.repeat(64),
    observedAt: OBSERVED_AT,
    recordedAt: EVIDENCE_RECORDED_AT,
    financialReconciliationEvidence: financialRow(financialOverrides),
    ...overrides,
  };
}

function balanceChanges() {
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

function canonicalBalanceChanges() {
  return balanceChanges().sort((left, right) => {
    const leftIdentity =
      left.assetType === 'token'
        ? `token:${left.assetAddress}`
        : `native:${left.assetSymbol}`;
    const rightIdentity =
      right.assetType === 'token'
        ? `token:${right.assetAddress}`
        : `native:${right.assetSymbol}`;
    return leftIdentity.localeCompare(rightIdentity);
  });
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

type CommitmentRow = ReturnType<typeof commitmentRow>;

function planFingerprint(): string {
  const assessment = prepareAgenticWalletMarketSwapAccountingMutationCommitment(
    {
      scope: 'agentic_wallet_market_swap_accounting_mutation_plan',
      accountingEvidenceId: ACCOUNTING_EVIDENCE_ID,
      completionEvidenceId: FINANCIAL_EVIDENCE_ID,
      gateId: GATE_ID,
      transactionHash: TRANSACTION_HASH,
      balanceTransitions: balanceChanges(),
      evidenceObservedAt: OBSERVED_AT,
      evidenceRecordedAt: EVIDENCE_RECORDED_AT,
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationAuthorized: false,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    } as AgenticWalletMarketSwapAccountingMutationPlan,
    MUTATION_ID,
    PREPARED_AT,
  );
  if (assessment.commitment === null)
    throw new Error('Test commitment is blocked');
  return assessment.commitment.planFingerprint;
}
