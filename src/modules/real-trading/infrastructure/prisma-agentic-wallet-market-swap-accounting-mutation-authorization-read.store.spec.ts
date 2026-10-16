import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AgenticWalletMarketSwapBalanceChange } from './agentic-wallet-market-swap-accounting-balance-evidence';
import {
  ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
  authorizeAgenticWalletMarketSwapAccountingMutation,
} from './agentic-wallet-market-swap-accounting-mutation-authorization';
import { AgenticWalletMarketSwapAccountingMutationAuthorizationIdentityError } from './agentic-wallet-market-swap-accounting-mutation-authorization.store';
import {
  AgenticWalletMarketSwapAccountingMutationCommitment,
  prepareAgenticWalletMarketSwapAccountingMutationCommitment,
} from './agentic-wallet-market-swap-accounting-mutation-commitment';
import { AgenticWalletMarketSwapAccountingMutationPlan } from './agentic-wallet-market-swap-accounting-mutation-plan';
import { PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationReadStore } from './prisma-agentic-wallet-market-swap-accounting-mutation-authorization-read.store';

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

describe('PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationReadStore', () => {
  it('rejects malformed gate identity before database access', async () => {
    const harness = repositoryHarness();

    await expect(
      harness.store.getByGateId('not-a-uuid'),
    ).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingMutationAuthorizationIdentityError,
    );
    expect(harness.findUnique).not.toHaveBeenCalled();
  });

  it('returns null when durable authorization is absent', async () => {
    const harness = repositoryHarness(null);

    await expect(harness.store.getByGateId(GATE_ID)).resolves.toBeNull();
  });

  it('loads and revalidates the complete durable authorization relation', async () => {
    const row = authorizationRow();
    const harness = repositoryHarness(row);

    const result = await harness.store.getByGateId(GATE_ID);

    expect(result).toMatchObject({
      authorization: {
        authorizationId: AUTHORIZATION_ID,
        accountingMutationAuthorized: true,
        accountingMutationComplete: false,
        submissionRetryAllowed: false,
      },
      recordedAt: AUTHORIZATION_RECORDED_AT,
    });
    expect(result?.authorization).not.toBe(row);
    expect(result?.authorization.authorizedAt).not.toBe(row.authorizedAt);
    expect(harness.findUnique).toHaveBeenCalledWith({
      where: { gateId: GATE_ID },
      include: {
        accountingMutationCommitment: {
          include: {
            accountingBalanceEvidence: {
              include: { financialReconciliationEvidence: true },
            },
          },
        },
      },
    });
  });

  it('rejects cross-gate authorization data', async () => {
    const harness = repositoryHarness(
      authorizationRow({ gateId: '99999999-9999-4999-8999-999999999999' }),
    );

    await expect(harness.store.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted accounting balance evidence is inconsistent',
    );
  });

  it('rejects an invalid persisted acknowledgment', async () => {
    const harness = repositoryHarness(
      authorizationRow({ acknowledgment: 'invalid' }),
    );

    await expect(harness.store.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted accounting mutation authorization is invalid',
    );
  });

  it('rejects divergent commitment content', async () => {
    const row = authorizationRow();
    row.accountingMutationCommitment.planFingerprint = 'f'.repeat(64);
    const harness = repositoryHarness(row);

    await expect(harness.store.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted accounting mutation commitment is invalid',
    );
  });

  it('rejects authorization recording before authorization time', async () => {
    const harness = repositoryHarness(
      authorizationRow({
        recordedAt: new Date('2026-10-03T12:00:12.999Z'),
      }),
    );

    await expect(harness.store.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted accounting mutation authorization is invalid',
    );
  });
});

function repositoryHarness(row: AuthorizationRow | null = authorizationRow()) {
  const findUnique = jest
    .fn<() => Promise<AuthorizationRow | null>>()
    .mockResolvedValue(row);
  const prisma = {
    realExecutionAccountingMutationAuthorization: { findUnique },
  } as unknown as PrismaService;
  return {
    findUnique,
    store:
      new PrismaAgenticWalletMarketSwapAccountingMutationAuthorizationReadStore(
        prisma,
      ),
  };
}

function authorizationRow(overrides: Record<string, unknown> = {}) {
  const commitmentAssessment =
    prepareAgenticWalletMarketSwapAccountingMutationCommitment(
      plan(),
      MUTATION_ID,
      PREPARED_AT,
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
  const value = authorizationAssessment.authorization;
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
    accountingMutationCommitment: commitmentRow(value.commitment.commitment),
    ...overrides,
  };
}

function commitmentRow(
  value: AgenticWalletMarketSwapAccountingMutationCommitment,
) {
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
    accountingBalanceEvidence: {
      id: ACCOUNTING_EVIDENCE_ID,
      financialReconciliationEvidenceId: FINANCIAL_EVIDENCE_ID,
      gateId: GATE_ID,
      transactionHash: TRANSACTION_HASH,
      balanceChanges: balanceTransitions(),
      requestFingerprint: 'b'.repeat(64),
      observedAt: OBSERVED_AT,
      recordedAt: EVIDENCE_RECORDED_AT,
      financialReconciliationEvidence: financialRow(),
    },
  };
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

type AuthorizationRow = ReturnType<typeof authorizationRow>;
