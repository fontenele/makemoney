import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AgenticWalletMarketSwapFinancialReconciliationCompletionIdentityError } from './agentic-wallet-market-swap-financial-reconciliation-completion.store';
import { PrismaAgenticWalletMarketSwapFinancialReconciliationCompletionStore } from './prisma-agentic-wallet-market-swap-financial-reconciliation-completion.store';

const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const EVIDENCE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const OBSERVATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const OBSERVED_AT = new Date('2026-10-03T12:00:07.000Z');
const RECORDED_AT = new Date('2026-10-03T12:00:08.000Z');

describe('PrismaAgenticWalletMarketSwapFinancialReconciliationCompletionStore', () => {
  it('rejects an invalid gate identity before database access', async () => {
    const harness = repositoryHarness();

    await expect(
      harness.store.getByGateId('not-a-uuid'),
    ).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapFinancialReconciliationCompletionIdentityError,
    );
    expect(harness.findUnique).not.toHaveBeenCalled();
  });

  it('returns null when no durable financial evidence exists', async () => {
    const harness = repositoryHarness(null);

    await expect(harness.store.getByGateId(GATE_ID)).resolves.toBeNull();
    expect(harness.findUnique).toHaveBeenCalledWith({
      where: { gateId: GATE_ID },
    });
  });

  it('loads and projects durable evidence into completed financial reconciliation', async () => {
    const harness = repositoryHarness(evidenceRow());

    await expect(harness.store.getByGateId(GATE_ID)).resolves.toEqual({
      scope: 'agentic_wallet_market_swap_financial_reconciliation_completion',
      evidenceId: EVIDENCE_ID,
      providerId: 'agentic_wallet',
      chainId: '56',
      gateId: GATE_ID,
      providerOrderId: '1234567890',
      statusObservationId: OBSERVATION_ID,
      transactionHash: TRANSACTION_HASH,
      sourceTokenAddress: USDT,
      targetTokenAddress: BTCB,
      submittedSourceQuantity: '5',
      actualReceivedQuantity: '0.000071',
      providerFeeComponents: [],
      networkFeeAsset: 'BNB',
      networkFeeQuantity: '0.0003',
      evidenceObservedAt: OBSERVED_AT,
      evidenceRecordedAt: RECORDED_AT,
      financialReconciliationRequired: true,
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    });
  });

  it('rejects a valid persisted row that contradicts the requested gate', async () => {
    const harness = repositoryHarness(
      evidenceRow({ gateId: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' }),
    );

    await expect(harness.store.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted financial reconciliation completion is inconsistent',
    );
  });

  it.each([
    { actualTargetReceivedQuantity: '0' },
    { providerId: 'different_provider' },
    { recordedAt: new Date('2026-10-03T12:00:06.999Z') },
    { providerFeeComponents: [{ assetAddress: USDT, quantity: '-1' }] },
  ])('rejects malformed persisted evidence %#', async (override) => {
    const harness = repositoryHarness(evidenceRow(override));

    await expect(harness.store.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted financial reconciliation evidence is invalid',
    );
  });
});

function repositoryHarness(row: EvidenceRow | null = evidenceRow()) {
  const findUnique = jest
    .fn<() => Promise<EvidenceRow | null>>()
    .mockResolvedValue(row);
  const prisma = {
    realExecutionFinancialReconciliationEvidence: { findUnique },
  } as unknown as PrismaService;
  return {
    findUnique,
    store:
      new PrismaAgenticWalletMarketSwapFinancialReconciliationCompletionStore(
        prisma,
      ),
  };
}

function evidenceRow(overrides: Record<string, unknown> = {}) {
  return {
    id: EVIDENCE_ID,
    gateId: GATE_ID,
    statusObservationId: OBSERVATION_ID,
    providerId: 'agentic_wallet',
    providerOrderId: '1234567890',
    chainId: '56',
    transactionHash: TRANSACTION_HASH,
    sourceTokenAddress: USDT,
    targetTokenAddress: BTCB,
    submittedSourceQuantity: '5',
    actualTargetReceivedQuantity: '0.000071',
    providerFeeComponents: [],
    networkFeeAsset: 'BNB',
    networkFeeQuantity: '0.0003',
    requestFingerprint: 'a'.repeat(64),
    observedAt: OBSERVED_AT,
    recordedAt: RECORDED_AT,
    ...overrides,
  };
}

type EvidenceRow = ReturnType<typeof evidenceRow>;
