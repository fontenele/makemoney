import { jest } from '@jest/globals';
import { createHash } from 'node:crypto';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AgenticWalletMarketSwapBalanceChange } from './agentic-wallet-market-swap-accounting-balance-evidence';
import {
  ACCOUNTING_MUTATION_APPLICATION_ACKNOWLEDGMENT,
  prepareAgenticWalletMarketSwapAccountingMutationApplication,
} from './agentic-wallet-market-swap-accounting-mutation-application';
import { AgenticWalletMarketSwapAccountingMutationApplicationIdentityError } from './agentic-wallet-market-swap-accounting-mutation-application.store';
import {
  ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
  authorizeAgenticWalletMarketSwapAccountingMutation,
} from './agentic-wallet-market-swap-accounting-mutation-authorization';
import { prepareAgenticWalletMarketSwapAccountingMutationCommitment } from './agentic-wallet-market-swap-accounting-mutation-commitment';
import { AgenticWalletMarketSwapAccountingMutationPlan } from './agentic-wallet-market-swap-accounting-mutation-plan';
import { PrismaAgenticWalletMarketSwapAccountingMutationApplicationReadStore } from './prisma-agentic-wallet-market-swap-accounting-mutation-application-read.store';

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
const EVIDENCE_OBSERVED_AT = new Date('2026-10-03T12:00:09.000Z');
const EVIDENCE_RECORDED_AT = new Date('2026-10-03T12:00:10.000Z');
const COMMITMENT_PREPARED_AT = new Date('2026-10-03T12:00:11.000Z');
const COMMITMENT_RECORDED_AT = new Date('2026-10-03T12:00:12.000Z');
const AUTHORIZED_AT = new Date('2026-10-03T12:00:13.000Z');
const AUTHORIZATION_RECORDED_AT = new Date('2026-10-03T12:00:14.000Z');
const BALANCES_OBSERVED_AT = new Date('2026-10-03T12:00:15.000Z');
const APPLICATION_PREPARED_AT = new Date('2026-10-03T12:00:16.000Z');
const APPLIED_AT = new Date('2026-10-03T12:00:17.000Z');

describe('PrismaAgenticWalletMarketSwapAccountingMutationApplicationReadStore', () => {
  it('loads and revalidates one completed application by gate', async () => {
    const harness = readerHarness(applicationRow());

    await expect(harness.reader.getByGateId(GATE_ID)).resolves.toMatchObject({
      scope: 'applied_agentic_wallet_market_swap_accounting_mutation',
      application: {
        applicationId: APPLICATION_ID,
        gateId: GATE_ID,
      },
      appliedAt: APPLIED_AT,
      accountingMutationComplete: true,
      submissionRetryAllowed: false,
    });
    expect(harness.findUnique).toHaveBeenCalledWith({
      where: { gateId: GATE_ID },
      include: {
        accountingMutationAuthorization: {
          include: {
            accountingMutationCommitment: {
              include: {
                accountingBalanceEvidence: {
                  include: { financialReconciliationEvidence: true },
                },
              },
            },
          },
        },
      },
    });
  });

  it('returns explicit absence', async () => {
    const harness = readerHarness(null);
    await expect(harness.reader.getByGateId(GATE_ID)).resolves.toBeNull();
  });

  it.each(['invalid', GATE_ID.toUpperCase(), `${GATE_ID}0`])(
    'rejects invalid gate identity %s before persistence access',
    async (gateId) => {
      const harness = readerHarness(null);
      await expect(harness.reader.getByGateId(gateId)).rejects.toBeInstanceOf(
        AgenticWalletMarketSwapAccountingMutationApplicationIdentityError,
      );
      expect(harness.findUnique).not.toHaveBeenCalled();
    },
  );

  it('rejects a row whose gate differs from its durable authorization', async () => {
    const harness = readerHarness(
      applicationRow({ gateId: '11111111-1111-4111-8111-111111111111' }),
    );
    await expect(harness.reader.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted accounting mutation application is invalid',
    );
  });

  it('rejects a divergent persisted request fingerprint', async () => {
    const harness = readerHarness(
      applicationRow({ requestFingerprint: 'f'.repeat(64) }),
    );
    await expect(harness.reader.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted accounting mutation application is invalid',
    );
  });

  it('rejects a malformed underlying authorization relation', async () => {
    const row = applicationRow();
    row.accountingMutationAuthorization.acknowledgment = 'invalid';
    const harness = readerHarness(row);
    await expect(harness.reader.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted accounting mutation authorization is invalid',
    );
  });

  it('returns defensive balance, transition, and date snapshots', async () => {
    const row = applicationRow();
    const harness = readerHarness(row);
    const applied = await harness.reader.getByGateId(GATE_ID);
    if (applied === null) throw new Error('Application was absent');

    expect(applied.application.currentBalances).not.toBe(row.currentBalances);
    expect(applied.application.balanceTransitions).not.toBe(
      row.balanceTransitions,
    );
    expect(applied.application.preparedAt).not.toBe(row.preparedAt);
    expect(applied.appliedAt).not.toBe(row.appliedAt);
  });
});

function readerHarness(row: ApplicationRow | null) {
  const findUnique = jest
    .fn<() => Promise<ApplicationRow | null>>()
    .mockResolvedValue(row);
  const prisma = {
    realExecutionAccountingMutationApplication: { findUnique },
  } as unknown as PrismaService;
  return {
    findUnique,
    reader:
      new PrismaAgenticWalletMarketSwapAccountingMutationApplicationReadStore(
        prisma,
      ),
  };
}

function application() {
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
      currentBalances: [
        {
          assetType: 'token',
          assetAddress: USDT,
          currentQuantity: '100',
        },
        {
          assetType: 'token',
          assetAddress: BTCB,
          currentQuantity: '0',
        },
        {
          assetType: 'native',
          assetSymbol: 'BNB',
          currentQuantity: '1',
        },
      ],
      balanceCoverageComplete: true,
      balancesObservedAt: BALANCES_OBSERVED_AT,
      preparedAt: APPLICATION_PREPARED_AT,
    });
  if (assessment.application === null) throw new Error('Application blocked');
  return assessment.application;
}

function storedAuthorization() {
  const commitment = prepareAgenticWalletMarketSwapAccountingMutationCommitment(
    plan(),
    MUTATION_ID,
    COMMITMENT_PREPARED_AT,
  ).commitment;
  if (commitment === null) throw new Error('Commitment blocked');
  const authorization = authorizeAgenticWalletMarketSwapAccountingMutation(
    { commitment, recordedAt: COMMITMENT_RECORDED_AT },
    {
      authorizationId: AUTHORIZATION_ID,
      mutationId: MUTATION_ID,
      planFingerprint: commitment.planFingerprint,
      gateId: GATE_ID,
      transactionHash: TRANSACTION_HASH,
      acknowledgment: ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
      authorizedAt: AUTHORIZED_AT,
    },
  ).authorization;
  if (authorization === null) throw new Error('Authorization blocked');
  return { authorization, recordedAt: AUTHORIZATION_RECORDED_AT };
}

function plan(): AgenticWalletMarketSwapAccountingMutationPlan {
  return {
    scope: 'agentic_wallet_market_swap_accounting_mutation_plan',
    accountingEvidenceId: ACCOUNTING_EVIDENCE_ID,
    completionEvidenceId: FINANCIAL_EVIDENCE_ID,
    gateId: GATE_ID,
    transactionHash: TRANSACTION_HASH,
    balanceTransitions: transitions(),
    evidenceObservedAt: EVIDENCE_OBSERVED_AT,
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
    observedAt: EVIDENCE_OBSERVED_AT,
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
    evidenceObservedAt: EVIDENCE_OBSERVED_AT,
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
    requestFingerprint: applicationFingerprint(),
    appliedAt: APPLIED_AT,
    accountingMutationAuthorization: authorizationRow(),
    ...overrides,
  };
}

function applicationFingerprint(): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(application())))
    .digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value))
    return value
      .map(canonicalize)
      .sort((left, right) =>
        JSON.stringify(left).localeCompare(JSON.stringify(right)),
      );
  if (value !== null && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  return value;
}

type ApplicationRow = ReturnType<typeof applicationRow>;
