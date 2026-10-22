import { jest } from '@jest/globals';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  FundingConversionFinancialReconciliationBlockedError,
  FundingConversionFinancialReconciliationConflictError,
  FundingConversionFinancialReconciliationContextNotFoundError,
} from '../application/agentic-wallet-funding-conversion-financial-reconciliation.store';
import { FundingConversionFinancialReconciliationEvidence } from './agentic-wallet-funding-conversion-financial-reconciliation-evidence';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';
import { PrismaAgenticWalletFundingConversionFinancialReconciliationStore } from './prisma-agentic-wallet-funding-conversion-financial-reconciliation.store';

const PLAN_ID = '019a0db1-bfea-7000-8000-000000000001';
const ATTEMPT_ID = '019a0db1-bfea-7000-8000-000000000002';
const STATUS_ID = '019a0db1-bfea-7000-8000-000000000003';
const RECONCILIATION_ID = '019a0db1-bfea-7000-8000-000000000004';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const OBSERVED_AT = new Date('2026-10-22T12:00:33.000Z');
const RECORDED_AT = new Date('2026-10-22T12:00:34.000Z');

describe('PrismaAgenticWalletFundingConversionFinancialReconciliationStore', () => {
  it('records reassessed terminal evidence and preserves its economic classification', async () => {
    const harness = repositoryHarness();

    await expect(
      harness.store.record(RECONCILIATION_ID, evidence(), RECORDED_AT),
    ).resolves.toMatchObject({
      reconciliation: {
        id: RECONCILIATION_ID,
        attemptId: ATTEMPT_ID,
        planId: PLAN_ID,
        expectedUsdt: '5.95',
        minimumUsdt: '5.92025',
        outputAssessment: 'minimum_satisfied_below_expected',
        evidence: evidence(),
        recordedAt: RECORDED_AT,
        financialReconciliationComplete: true,
        automaticRetryAllowed: false,
      },
      replayed: false,
    });
    expect(harness.create.mock.calls[0][0].data).toMatchObject({
      id: RECONCILIATION_ID,
      attemptId: ATTEMPT_ID,
      planId: PLAN_ID,
      statusObservationId: STATUS_ID,
      actualUsdtReceived: '5.93',
      outputAssessment: 'minimum_satisfied_below_expected',
      observedAt: OBSERVED_AT,
      recordedAt: RECORDED_AT,
    });
    expect(harness.create.mock.calls[0][0].data.requestFingerprint).toMatch(
      /^[a-f0-9]{64}$/,
    );
    expect(harness.prismaTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('records a below-minimum result without hiding the breach', async () => {
    const harness = repositoryHarness();
    const result = await harness.store.record(
      RECONCILIATION_ID,
      evidence({ actualUsdtReceived: '5.9' }),
      RECORDED_AT,
    );

    expect(result.reconciliation.outputAssessment).toBe(
      'below_accepted_minimum',
    );
    expect(result.reconciliation.financialReconciliationComplete).toBe(true);
  });

  it('replays only the exact immutable request without reloading context', async () => {
    const harness = repositoryHarness();
    await harness.store.record(RECONCILIATION_ID, evidence(), RECORDED_AT);
    harness.existingFindUnique.mockResolvedValue(
      reconciliationRow(harness.create.mock.calls[0][0].data),
    );
    harness.attemptFindUnique.mockClear();
    harness.statusFindUnique.mockClear();
    harness.create.mockClear();

    await expect(
      harness.store.record(RECONCILIATION_ID, evidence(), RECORDED_AT),
    ).resolves.toMatchObject({ replayed: true });
    expect(harness.attemptFindUnique).not.toHaveBeenCalled();
    expect(harness.statusFindUnique).not.toHaveBeenCalled();
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects divergent reuse of an already reconciled attempt', async () => {
    const harness = repositoryHarness();
    await harness.store.record(RECONCILIATION_ID, evidence(), RECORDED_AT);
    harness.existingFindUnique.mockResolvedValue(
      reconciliationRow(harness.create.mock.calls[0][0].data),
    );

    await expect(
      harness.store.record(
        RECONCILIATION_ID,
        evidence({ actualUsdtReceived: '5.94' }),
        RECORDED_AT,
      ),
    ).rejects.toBeInstanceOf(
      FundingConversionFinancialReconciliationConflictError,
    );
  });

  it.each(['attempt', 'status'] as const)(
    'rejects missing durable %s context',
    async (missing) => {
      const harness = repositoryHarness();
      if (missing === 'attempt')
        harness.attemptFindUnique.mockResolvedValue(null);
      else harness.statusFindUnique.mockResolvedValue(null);

      await expect(
        harness.store.record(RECONCILIATION_ID, evidence(), RECORDED_AT),
      ).rejects.toBeInstanceOf(
        FundingConversionFinancialReconciliationContextNotFoundError,
      );
      expect(harness.create).not.toHaveBeenCalled();
    },
  );

  it('blocks a nonterminal or identity-divergent durable context', async () => {
    const nonterminal = repositoryHarness();
    nonterminal.attemptFindUnique.mockResolvedValue(
      attemptRow({ state: 'submitted_pending_confirmation' }),
    );
    await expect(
      nonterminal.store.record(RECONCILIATION_ID, evidence(), RECORDED_AT),
    ).rejects.toBeInstanceOf(
      FundingConversionFinancialReconciliationBlockedError,
    );

    const divergent = repositoryHarness();
    divergent.statusFindUnique.mockResolvedValue(
      statusRow({ attemptId: '019a0db1-bfea-7000-8000-000000000099' }),
    );
    await expect(
      divergent.store.record(RECONCILIATION_ID, evidence(), RECORDED_AT),
    ).rejects.toBeInstanceOf(
      FundingConversionFinancialReconciliationBlockedError,
    );
  });

  it('reapplies the M10.134 gate against durable quantities and status', async () => {
    const quantityMismatch = repositoryHarness();
    quantityMismatch.attemptFindUnique.mockResolvedValue(
      attemptRow({ freshSourceQuantityBnb: '0.009' }),
    );
    const error: unknown = await quantityMismatch.store
      .record(RECONCILIATION_ID, evidence(), RECORDED_AT)
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(
      FundingConversionFinancialReconciliationBlockedError,
    );
    if (
      !(error instanceof FundingConversionFinancialReconciliationBlockedError)
    )
      throw error;
    expect(error.blockers).toContain(
      'financial_evidence_source_quantity_mismatch',
    );

    const unfinished = repositoryHarness();
    unfinished.statusFindUnique.mockResolvedValue(
      statusRow({ providerStatus: 'PENDING', transactionHash: null }),
    );
    await expect(
      unfinished.store.record(RECONCILIATION_ID, evidence(), RECORDED_AT),
    ).rejects.toBeInstanceOf(
      FundingConversionFinancialReconciliationBlockedError,
    );
  });

  it('rejects invalid recording metadata and malformed persisted replay', async () => {
    const early = repositoryHarness();
    await expect(
      early.store.record(
        RECONCILIATION_ID,
        evidence(),
        new Date('2026-10-22T12:00:32.999Z'),
      ),
    ).rejects.toBeInstanceOf(
      FundingConversionFinancialReconciliationBlockedError,
    );

    const malformed = repositoryHarness();
    await malformed.store.record(RECONCILIATION_ID, evidence(), RECORDED_AT);
    malformed.existingFindUnique.mockResolvedValue(
      reconciliationRow({
        ...malformed.create.mock.calls[0][0].data,
        outputAssessment: 'expected_output_satisfied',
      }),
    );
    await expect(
      malformed.store.record(RECONCILIATION_ID, evidence(), RECORDED_AT),
    ).rejects.toThrow(
      'Persisted funding conversion financial reconciliation is invalid',
    );
  });
});

function repositoryHarness() {
  const existingFindUnique = jest
    .fn<() => Promise<ReconciliationRow | null>>()
    .mockResolvedValue(null);
  const attemptFindUnique = jest
    .fn<() => Promise<AttemptRow | null>>()
    .mockResolvedValue(attemptRow());
  const statusFindUnique = jest
    .fn<() => Promise<StatusRow | null>>()
    .mockResolvedValue(statusRow());
  const create = jest.fn(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(reconciliationRow(data)),
  );
  const tx = {
    $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    agenticWalletFundingConversionFinancialReconciliation: {
      findUnique: existingFindUnique,
      create,
    },
    agenticWalletFundingConversionSubmissionAttempt: {
      findUnique: attemptFindUnique,
    },
    agenticWalletFundingConversionStatusObservation: {
      findUnique: statusFindUnique,
    },
  };
  const prismaTransaction = jest.fn(
    async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  );
  const prisma = {
    $transaction: prismaTransaction,
  } as unknown as PrismaService;
  return {
    attemptFindUnique,
    create,
    existingFindUnique,
    prismaTransaction,
    statusFindUnique,
    store: new PrismaAgenticWalletFundingConversionFinancialReconciliationStore(
      prisma,
    ),
  };
}

function evidence(
  overrides: Partial<FundingConversionFinancialReconciliationEvidence> = {},
): FundingConversionFinancialReconciliationEvidence {
  return {
    scope:
      'agentic_wallet_funding_conversion_financial_reconciliation_evidence',
    attemptId: ATTEMPT_ID,
    providerOrderId: 'order_123',
    statusObservationId: STATUS_ID,
    transactionHash: TRANSACTION_HASH,
    chainId: '56',
    sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(),
    targetTokenAddress: BSC_USDT_ADDRESS.toLowerCase(),
    submittedSourceQuantityBnb: '0.008',
    actualUsdtReceived: '5.93',
    providerFeeComponents: [
      { assetAddress: BSC_USDT_ADDRESS.toLowerCase(), quantity: '0.01' },
      { assetAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(), quantity: '0' },
    ],
    networkFeeAsset: 'BNB',
    networkFeeQuantityBnb: '0.00002',
    transactionReceiptObserved: true,
    sourceBalanceDeltaObserved: true,
    targetBalanceDeltaObserved: true,
    providerFeeCoverageComplete: true,
    networkFeeCoverageComplete: true,
    observedAt: OBSERVED_AT,
    ...overrides,
  };
}

function attemptRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ATTEMPT_ID,
    planId: PLAN_ID,
    freshSourceQuantityBnb: '0.008',
    freshExpectedUsdt: '5.95',
    freshMinimumUsdt: '5.92025',
    state: 'provider_finished_pending_financial_reconciliation',
    providerOrderId: 'order_123',
    automaticRetryAllowed: false,
    plan: { id: PLAN_ID },
    ...overrides,
  };
}

function statusRow(overrides: Record<string, unknown> = {}) {
  return {
    id: STATUS_ID,
    attemptId: ATTEMPT_ID,
    providerOrderId: 'order_123',
    providerStatus: 'FINISHED',
    transactionHash: TRANSACTION_HASH,
    bookedAt: new Date('2026-10-22T12:00:30.000Z'),
    providerUpdatedAt: new Date('2026-10-22T12:00:31.000Z'),
    recordedAt: new Date('2026-10-22T12:00:32.000Z'),
    ...overrides,
  };
}

function reconciliationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: RECONCILIATION_ID,
    attemptId: ATTEMPT_ID,
    planId: PLAN_ID,
    statusObservationId: STATUS_ID,
    providerOrderId: 'order_123',
    transactionHash: TRANSACTION_HASH,
    chainId: '56',
    sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(),
    targetTokenAddress: BSC_USDT_ADDRESS.toLowerCase(),
    submittedSourceQuantityBnb: '0.008',
    expectedUsdt: '5.95',
    minimumUsdt: '5.92025',
    actualUsdtReceived: '5.93',
    outputAssessment: 'minimum_satisfied_below_expected',
    providerFeeComponents: [
      { assetAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(), quantity: '0' },
      { assetAddress: BSC_USDT_ADDRESS.toLowerCase(), quantity: '0.01' },
    ],
    networkFeeAsset: 'BNB',
    networkFeeQuantityBnb: '0.00002',
    observedAt: OBSERVED_AT,
    requestFingerprint: 'a'.repeat(64),
    recordedAt: RECORDED_AT,
    ...overrides,
  };
}

type AttemptRow = ReturnType<typeof attemptRow>;
type StatusRow = ReturnType<typeof statusRow>;
type ReconciliationRow = ReturnType<typeof reconciliationRow>;
