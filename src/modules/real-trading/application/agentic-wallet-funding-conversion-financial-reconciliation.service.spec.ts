import { jest } from '@jest/globals';

import { AgenticWalletFundingConversionFinancialEvidenceReader } from './agentic-wallet-funding-conversion-financial-evidence.reader';
import {
  AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore,
  AgenticWalletFundingConversionFinancialReconciliationStore,
  StoredFundingConversionFinancialReconciliation,
} from './agentic-wallet-funding-conversion-financial-reconciliation.store';
import {
  AgenticWalletFundingConversionFinancialReconciliationService,
  FundingConversionFinancialReconciliationServiceCanceledError,
  FundingConversionFinancialReconciliationServiceIdentityError,
} from './agentic-wallet-funding-conversion-financial-reconciliation.service';
import { FundingConversionFinancialReconciliationEvidence } from '../infrastructure/agentic-wallet-funding-conversion-financial-reconciliation-evidence';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from '../infrastructure/agentic-wallet-funding-conversion-quote.adapter';

const ATTEMPT_ID = '019a0db1-bfea-7000-8000-000000000002';
const PLAN_ID = '019a0db1-bfea-7000-8000-000000000001';
const STATUS_ID = '019a0db1-bfea-7000-8000-000000000003';
const RECONCILIATION_ID = '019a0db1-bfea-7000-8000-000000000004';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const OBSERVED_AT = new Date('2026-10-23T12:00:00.000Z');
const RECORDED_AT = new Date('2026-10-23T12:00:01.000Z');

describe('AgenticWalletFundingConversionFinancialReconciliationService', () => {
  it('returns an existing reconciliation without reading evidence', async () => {
    const harness = createHarness({ existing: storedReconciliation() });

    await expect(harness.service.reconcileOnce(ATTEMPT_ID)).resolves.toEqual({
      scope: 'agentic_wallet_funding_conversion_financial_reconciliation',
      status: 'reconciliation_already_recorded',
      blockers: [],
      reconciliation: storedReconciliation(),
      reconciliationReplayed: true,
      evidenceReadStarted: false,
      evidenceReadCompleted: false,
      financialReconciliationRequired: false,
      financialReconciliationComplete: true,
      automaticRetryAllowed: false,
    });
    expect(harness.load).not.toHaveBeenCalled();
    expect(harness.record).not.toHaveBeenCalled();
  });

  it('records one complete evidence package', async () => {
    const harness = createHarness();

    await expect(harness.service.reconcileOnce(ATTEMPT_ID)).resolves.toEqual({
      scope: 'agentic_wallet_funding_conversion_financial_reconciliation',
      status: 'reconciliation_recorded',
      blockers: [],
      reconciliation: storedReconciliation(),
      reconciliationReplayed: false,
      evidenceReadStarted: true,
      evidenceReadCompleted: true,
      financialReconciliationRequired: false,
      financialReconciliationComplete: true,
      automaticRetryAllowed: false,
    });
    expect(harness.load).toHaveBeenCalledWith(ATTEMPT_ID, undefined);
    expect(harness.record).toHaveBeenCalledWith(
      RECONCILIATION_ID,
      evidence(),
      RECORDED_AT,
    );
    expect(harness.record.mock.calls[0][2]).not.toBe(RECORDED_AT);
  });

  it('returns explicit unavailable evidence without persistence', async () => {
    const harness = createHarness({
      loadedEvidence: {
        status: 'evidence_unavailable',
        blockers: ['terminal_funding_conversion_context_unavailable'],
      },
    });

    await expect(
      harness.service.reconcileOnce(ATTEMPT_ID),
    ).resolves.toMatchObject({
      status: 'evidence_unavailable',
      blockers: ['terminal_funding_conversion_context_unavailable'],
      evidenceReadStarted: true,
      evidenceReadCompleted: true,
      financialReconciliationComplete: false,
      automaticRetryAllowed: false,
    });
    expect(harness.record).not.toHaveBeenCalled();
  });

  it('withholds malformed evidence from persistence', async () => {
    const harness = createHarness({
      loadedEvidence: {
        status: 'evidence_available',
        evidence: { ...evidence(), transactionHash: 'invalid' },
      },
    });

    await expect(
      harness.service.reconcileOnce(ATTEMPT_ID),
    ).resolves.toMatchObject({
      status: 'evidence_invalid',
      blockers: ['invalid_financial_evidence'],
      financialReconciliationComplete: false,
    });
    expect(harness.record).not.toHaveBeenCalled();
  });

  it.each([
    { id: 'invalid', now: RECORDED_AT },
    { id: RECONCILIATION_ID, now: new Date('2026-10-22T11:59:59.000Z') },
    { id: RECONCILIATION_ID, now: new Date(Number.NaN) },
  ])('blocks invalid recording metadata %#', async ({ id, now }) => {
    const harness = createHarness({ reconciliationId: id, recordedAt: now });

    await expect(
      harness.service.reconcileOnce(ATTEMPT_ID),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['invalid_recording_identity_or_time'],
    });
    expect(harness.record).not.toHaveBeenCalled();
  });

  it('suppresses overlapping work for the same attempt', async () => {
    let release!: (value: {
      status: 'evidence_available';
      evidence: FundingConversionFinancialReconciliationEvidence;
    }) => void;
    const pending = new Promise<{
      status: 'evidence_available';
      evidence: FundingConversionFinancialReconciliationEvidence;
    }>((resolve) => {
      release = resolve;
    });
    const harness = createHarness({ loadedEvidence: pending });
    const first = harness.service.reconcileOnce(ATTEMPT_ID);
    await Promise.resolve();

    await expect(
      harness.service.reconcileOnce(ATTEMPT_ID),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['financial_reconciliation_in_progress'],
      evidenceReadStarted: false,
    });
    release({ status: 'evidence_available', evidence: evidence() });
    await expect(first).resolves.toMatchObject({
      status: 'reconciliation_recorded',
    });
    expect(harness.load).toHaveBeenCalledTimes(1);
  });

  it('propagates evidence-reader failure and releases the attempt claim', async () => {
    const harness = createHarness();
    harness.load.mockRejectedValueOnce(new Error('reader failed'));

    await expect(harness.service.reconcileOnce(ATTEMPT_ID)).rejects.toThrow(
      'reader failed',
    );
    await expect(
      harness.service.reconcileOnce(ATTEMPT_ID),
    ).resolves.toMatchObject({ status: 'reconciliation_recorded' });
  });

  it('propagates store failure and releases the attempt claim', async () => {
    const harness = createHarness();
    harness.record.mockRejectedValueOnce(new Error('store failed'));

    await expect(harness.service.reconcileOnce(ATTEMPT_ID)).rejects.toThrow(
      'store failed',
    );
    await expect(
      harness.service.reconcileOnce(ATTEMPT_ID),
    ).resolves.toMatchObject({ status: 'reconciliation_recorded' });
  });

  it('rejects invalid identity before dependency access', async () => {
    const harness = createHarness();

    await expect(
      harness.service.reconcileOnce('invalid'),
    ).rejects.toBeInstanceOf(
      FundingConversionFinancialReconciliationServiceIdentityError,
    );
    expect(harness.getByAttemptId).not.toHaveBeenCalled();
  });

  it('rejects pre-canceled work before dependency access', async () => {
    const harness = createHarness();
    const controller = new AbortController();
    controller.abort();

    await expect(
      harness.service.reconcileOnce(ATTEMPT_ID, controller.signal),
    ).rejects.toBeInstanceOf(
      FundingConversionFinancialReconciliationServiceCanceledError,
    );
    expect(harness.getByAttemptId).not.toHaveBeenCalled();
  });
});

function createHarness(options?: {
  existing?: StoredFundingConversionFinancialReconciliation | null;
  loadedEvidence?: unknown;
  reconciliationId?: string;
  recordedAt?: Date;
}) {
  const getByAttemptId = jest
    .fn<() => Promise<StoredFundingConversionFinancialReconciliation | null>>()
    .mockResolvedValue(options?.existing ?? null);
  const load = jest
    .fn<() => Promise<unknown>>()
    .mockImplementation(async () =>
      options !== undefined && 'loadedEvidence' in options
        ? await options.loadedEvidence
        : { status: 'evidence_available', evidence: evidence() },
    );
  const record = jest
    .fn<
      () => Promise<{
        reconciliation: StoredFundingConversionFinancialReconciliation;
        replayed: boolean;
      }>
    >()
    .mockResolvedValue({
      reconciliation: storedReconciliation(),
      replayed: false,
    });
  return {
    getByAttemptId,
    load,
    record,
    service: new AgenticWalletFundingConversionFinancialReconciliationService(
      {
        getByAttemptId,
      } satisfies AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore,
      { load } satisfies AgenticWalletFundingConversionFinancialEvidenceReader,
      {
        record,
      } satisfies AgenticWalletFundingConversionFinancialReconciliationStore,
      () => options?.recordedAt ?? RECORDED_AT,
      () => options?.reconciliationId ?? RECONCILIATION_ID,
    ),
  };
}

function evidence(): FundingConversionFinancialReconciliationEvidence {
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
    providerFeeComponents: [],
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

function storedReconciliation(): StoredFundingConversionFinancialReconciliation {
  return {
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
  };
}
