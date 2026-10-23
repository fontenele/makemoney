import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  FundingConversionFinancialReconciliationAttemptIdentityError,
  FundingConversionFinancialReconciliationIdentityError,
  FundingConversionFinancialReconciliationStatusObservationIdentityError,
} from '../application/agentic-wallet-funding-conversion-financial-reconciliation.store';
import { FundingConversionFinancialReconciliationEvidence } from './agentic-wallet-funding-conversion-financial-reconciliation-evidence';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';
import { PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore } from './prisma-agentic-wallet-funding-conversion-financial-reconciliation-read.store';
import { PrismaAgenticWalletFundingConversionFinancialReconciliationStore } from './prisma-agentic-wallet-funding-conversion-financial-reconciliation.store';

const PLAN_ID = '019a0db1-bfea-7000-8000-000000000001';
const ATTEMPT_ID = '019a0db1-bfea-7000-8000-000000000002';
const STATUS_ID = '019a0db1-bfea-7000-8000-000000000003';
const RECONCILIATION_ID = '019a0db1-bfea-7000-8000-000000000004';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const OBSERVED_AT = new Date('2026-10-22T12:00:33.000Z');
const RECORDED_AT = new Date('2026-10-22T12:00:34.000Z');

describe('PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore', () => {
  it('returns a fully reconstructed defensive reconciliation', async () => {
    const row = await persistedRow();
    const harness = readerHarness(row);

    const reconciliation =
      await harness.reader.getByReconciliationId(RECONCILIATION_ID);
    expect(reconciliation).toMatchObject({
      id: RECONCILIATION_ID,
      attemptId: ATTEMPT_ID,
      planId: PLAN_ID,
      outputAssessment: 'minimum_satisfied_below_expected',
      financialReconciliationComplete: true,
      automaticRetryAllowed: false,
    });
    expect(reconciliation?.evidence.providerFeeComponents).not.toBe(
      row.providerFeeComponents,
    );
    expect(harness.findUnique).toHaveBeenCalledWith({
      where: { id: RECONCILIATION_ID },
    });
  });

  it('returns explicit absence for an unknown valid identity', async () => {
    await expect(
      readerHarness(null).reader.getByReconciliationId(RECONCILIATION_ID),
    ).resolves.toBeNull();
  });

  it.each(['invalid', RECONCILIATION_ID.toUpperCase()])(
    'rejects invalid identity %s before persistence access',
    async (identity) => {
      const harness = readerHarness(null);
      await expect(
        harness.reader.getByReconciliationId(identity),
      ).rejects.toBeInstanceOf(
        FundingConversionFinancialReconciliationIdentityError,
      );
      expect(harness.findUnique).not.toHaveBeenCalled();
    },
  );

  it('rejects malformed persisted evidence', async () => {
    const row = await persistedRow();
    const harness = readerHarness({
      ...row,
      outputAssessment: 'expected_output_satisfied',
    });
    await expect(
      harness.reader.getByReconciliationId(RECONCILIATION_ID),
    ).rejects.toThrow(
      'Persisted funding conversion financial reconciliation is invalid',
    );
  });

  it('rejects a row whose identity diverges from the request', async () => {
    const row = await persistedRow();
    const divergentId = '019a0db1-bfea-7000-8000-000000000005';
    const harness = readerHarness(await persistedRow(divergentId));
    await expect(
      harness.reader.getByReconciliationId(RECONCILIATION_ID),
    ).rejects.toThrow(
      'Persisted funding conversion financial reconciliation identity diverges',
    );
    expect(row.id).toBe(RECONCILIATION_ID);
  });

  it('returns the reconciliation for its unique attempt identity', async () => {
    const harness = readerHarness(await persistedRow());

    await expect(
      harness.reader.getByAttemptId(ATTEMPT_ID),
    ).resolves.toMatchObject({
      id: RECONCILIATION_ID,
      attemptId: ATTEMPT_ID,
      planId: PLAN_ID,
      financialReconciliationComplete: true,
      automaticRetryAllowed: false,
    });
    expect(harness.findUnique).toHaveBeenCalledWith({
      where: { attemptId: ATTEMPT_ID },
    });
  });

  it('returns explicit absence for an attempt without reconciliation', async () => {
    await expect(
      readerHarness(null).reader.getByAttemptId(ATTEMPT_ID),
    ).resolves.toBeNull();
  });

  it('rejects malformed persisted evidence selected by attempt', async () => {
    const row = await persistedRow();
    const harness = readerHarness({
      ...row,
      outputAssessment: 'expected_output_satisfied',
    });
    await expect(harness.reader.getByAttemptId(ATTEMPT_ID)).rejects.toThrow(
      'Persisted funding conversion financial reconciliation is invalid',
    );
  });

  it.each(['invalid', ATTEMPT_ID.toUpperCase()])(
    'rejects invalid attempt identity %s before persistence access',
    async (identity) => {
      const harness = readerHarness(null);
      await expect(
        harness.reader.getByAttemptId(identity),
      ).rejects.toBeInstanceOf(
        FundingConversionFinancialReconciliationAttemptIdentityError,
      );
      expect(harness.findUnique).not.toHaveBeenCalled();
    },
  );

  it('rejects a row whose attempt identity diverges from the request', async () => {
    const divergentAttemptId = '019a0db1-bfea-7000-8000-000000000005';
    const harness = readerHarness(
      await persistedRow(RECONCILIATION_ID, divergentAttemptId),
    );
    await expect(harness.reader.getByAttemptId(ATTEMPT_ID)).rejects.toThrow(
      'Persisted funding conversion financial reconciliation attempt identity diverges',
    );
  });

  it('returns the reconciliation for its unique status observation identity', async () => {
    const harness = readerHarness(await persistedRow());

    await expect(
      harness.reader.getByStatusObservationId(STATUS_ID),
    ).resolves.toMatchObject({
      id: RECONCILIATION_ID,
      attemptId: ATTEMPT_ID,
      evidence: { statusObservationId: STATUS_ID },
      financialReconciliationComplete: true,
      automaticRetryAllowed: false,
    });
    expect(harness.findUnique).toHaveBeenCalledWith({
      where: { statusObservationId: STATUS_ID },
    });
  });

  it('returns explicit absence for a status observation without reconciliation', async () => {
    await expect(
      readerHarness(null).reader.getByStatusObservationId(STATUS_ID),
    ).resolves.toBeNull();
  });

  it('rejects malformed persisted evidence selected by status observation', async () => {
    const row = await persistedRow();
    const harness = readerHarness({
      ...row,
      outputAssessment: 'expected_output_satisfied',
    });
    await expect(
      harness.reader.getByStatusObservationId(STATUS_ID),
    ).rejects.toThrow(
      'Persisted funding conversion financial reconciliation is invalid',
    );
  });

  it.each(['invalid', STATUS_ID.toUpperCase()])(
    'rejects invalid status observation identity %s before persistence access',
    async (identity) => {
      const harness = readerHarness(null);
      await expect(
        harness.reader.getByStatusObservationId(identity),
      ).rejects.toBeInstanceOf(
        FundingConversionFinancialReconciliationStatusObservationIdentityError,
      );
      expect(harness.findUnique).not.toHaveBeenCalled();
    },
  );

  it('rejects a row whose status observation identity diverges from the request', async () => {
    const divergentStatusId = '019a0db1-bfea-7000-8000-000000000005';
    const harness = readerHarness(
      await persistedRow(RECONCILIATION_ID, ATTEMPT_ID, divergentStatusId),
    );
    await expect(
      harness.reader.getByStatusObservationId(STATUS_ID),
    ).rejects.toThrow(
      'Persisted funding conversion financial reconciliation status observation identity diverges',
    );
  });
});

function readerHarness(row: ReconciliationRow | null) {
  const findUnique = jest
    .fn<() => Promise<ReconciliationRow | null>>()
    .mockResolvedValue(row);
  const prisma = {
    agenticWalletFundingConversionFinancialReconciliation: { findUnique },
  } as unknown as PrismaService;
  return {
    findUnique,
    reader:
      new PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore(
        prisma,
      ),
  };
}

async function persistedRow(
  id = RECONCILIATION_ID,
  attemptId = ATTEMPT_ID,
  statusObservationId = STATUS_ID,
) {
  const create = jest.fn(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({ ...data }),
  );
  const tx = {
    $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    agenticWalletFundingConversionFinancialReconciliation: {
      findUnique: jest.fn<() => Promise<null>>().mockResolvedValue(null),
      create,
    },
    agenticWalletFundingConversionSubmissionAttempt: {
      findUnique: jest
        .fn<() => Promise<ReturnType<typeof attemptRow>>>()
        .mockResolvedValue(attemptRow(attemptId)),
    },
    agenticWalletFundingConversionStatusObservation: {
      findUnique: jest
        .fn<() => Promise<ReturnType<typeof statusRow>>>()
        .mockResolvedValue(statusRow(attemptId, statusObservationId)),
    },
  };
  const prisma = {
    $transaction: jest.fn(
      async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
    ),
  } as unknown as PrismaService;
  await new PrismaAgenticWalletFundingConversionFinancialReconciliationStore(
    prisma,
  ).record(id, evidence(attemptId, statusObservationId), RECORDED_AT);
  return create.mock.calls[0][0].data as ReconciliationRow;
}

function evidence(
  attemptId = ATTEMPT_ID,
  statusObservationId = STATUS_ID,
): FundingConversionFinancialReconciliationEvidence {
  return {
    scope:
      'agentic_wallet_funding_conversion_financial_reconciliation_evidence',
    attemptId,
    providerOrderId: 'order_123',
    statusObservationId,
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
  };
}

function attemptRow(id = ATTEMPT_ID) {
  return {
    id,
    planId: PLAN_ID,
    freshSourceQuantityBnb: '0.008',
    freshExpectedUsdt: '5.95',
    freshMinimumUsdt: '5.92025',
    state: 'provider_finished_pending_financial_reconciliation',
    providerOrderId: 'order_123',
    automaticRetryAllowed: false,
    plan: { id: PLAN_ID },
  };
}

function statusRow(attemptId = ATTEMPT_ID, id = STATUS_ID) {
  return {
    id,
    attemptId,
    providerOrderId: 'order_123',
    providerStatus: 'FINISHED',
    transactionHash: TRANSACTION_HASH,
    bookedAt: new Date('2026-10-22T12:00:30.000Z'),
    providerUpdatedAt: new Date('2026-10-22T12:00:31.000Z'),
    recordedAt: new Date('2026-10-22T12:00:32.000Z'),
  };
}

type ReconciliationRow = {
  id: string;
  attemptId: string;
  planId: string;
  statusObservationId: string;
  providerOrderId: string;
  transactionHash: string;
  chainId: string;
  sourceTokenAddress: string;
  targetTokenAddress: string;
  submittedSourceQuantityBnb: string;
  expectedUsdt: string;
  minimumUsdt: string;
  actualUsdtReceived: string;
  outputAssessment: string;
  providerFeeComponents: unknown;
  networkFeeAsset: string;
  networkFeeQuantityBnb: string;
  observedAt: Date;
  requestFingerprint: string;
  recordedAt: Date;
};
