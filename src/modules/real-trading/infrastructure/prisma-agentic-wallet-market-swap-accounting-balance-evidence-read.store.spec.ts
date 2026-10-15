import { jest } from '@jest/globals';

import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AgenticWalletMarketSwapAccountingBalanceEvidenceIdentityError } from './agentic-wallet-market-swap-accounting-balance-evidence.store';
import { PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceReadStore } from './prisma-agentic-wallet-market-swap-accounting-balance-evidence-read.store';

const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_GATE_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const FINANCIAL_EVIDENCE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ACCOUNTING_EVIDENCE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const STATUS_OBSERVATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const OBSERVED_AT = new Date('2026-10-03T12:00:09.000Z');
const RECORDED_AT = new Date('2026-10-03T12:00:10.000Z');

describe('PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceReadStore', () => {
  it('rejects an invalid gate identity before database access', async () => {
    const harness = repositoryHarness();

    await expect(
      harness.store.getByGateId('not-a-uuid'),
    ).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingBalanceEvidenceIdentityError,
    );
    expect(harness.findUnique).not.toHaveBeenCalled();
  });

  it('returns null when no durable accounting balance evidence exists', async () => {
    const harness = repositoryHarness(null);

    await expect(harness.store.getByGateId(GATE_ID)).resolves.toBeNull();
    expect(harness.findUnique).toHaveBeenCalledWith({
      where: { gateId: GATE_ID },
      include: { financialReconciliationEvidence: true },
    });
  });

  it('loads, revalidates, and defensively returns durable balance evidence', async () => {
    const row = accountingRow();
    const harness = repositoryHarness(row);

    const stored = await harness.store.getByGateId(GATE_ID);

    expect(stored).toEqual({
      id: ACCOUNTING_EVIDENCE_ID,
      evidence: {
        scope: 'agentic_wallet_market_swap_accounting_balance_evidence',
        completionEvidenceId: FINANCIAL_EVIDENCE_ID,
        gateId: GATE_ID,
        transactionHash: TRANSACTION_HASH,
        balanceChanges: [
          row.balanceChanges[2],
          row.balanceChanges[0],
          row.balanceChanges[1],
        ],
        coverageComplete: true,
        observedAt: OBSERVED_AT,
      },
      recordedAt: RECORDED_AT,
    });
    expect(stored!.evidence.balanceChanges).not.toBe(row.balanceChanges);
    expect(stored!.evidence.observedAt).not.toBe(row.observedAt);
    expect(stored!.recordedAt).not.toBe(row.recordedAt);
  });

  it('rejects a valid row that contradicts the requested gate', async () => {
    const harness = repositoryHarness(
      accountingRow({ gateId: OTHER_GATE_ID }, { gateId: OTHER_GATE_ID }),
    );

    await expect(harness.store.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted accounting balance evidence is inconsistent',
    );
  });

  it('rejects accounting evidence linked to another financial evidence identity', async () => {
    const harness = repositoryHarness(
      accountingRow({
        financialReconciliationEvidenceId:
          'ffffffff-ffff-4fff-8fff-ffffffffffff',
      }),
    );

    await expect(harness.store.getByGateId(GATE_ID)).rejects.toThrow(
      'Persisted accounting balance evidence is inconsistent',
    );
  });

  it.each([
    accountingRow({ balanceChanges: [] }),
    accountingRow({}, { actualTargetReceivedQuantity: '0' }),
  ])('rejects malformed persisted evidence %#', async (row) => {
    const harness = repositoryHarness(row);

    await expect(harness.store.getByGateId(GATE_ID)).rejects.toThrow(
      /Persisted (accounting balance|financial reconciliation) evidence is invalid/,
    );
  });
});

function repositoryHarness(row: AccountingRow | null = accountingRow()) {
  const findUnique = jest
    .fn<() => Promise<AccountingRow | null>>()
    .mockResolvedValue(row);
  const prisma = {
    realExecutionAccountingBalanceEvidence: { findUnique },
  } as unknown as PrismaService;
  return {
    findUnique,
    store: new PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceReadStore(
      prisma,
    ),
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
    recordedAt: RECORDED_AT,
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

type AccountingRow = ReturnType<typeof accountingRow>;
