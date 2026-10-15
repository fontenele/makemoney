import { jest } from '@jest/globals';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletMarketSwapAccountingBalanceEvidence,
  AgenticWalletMarketSwapBalanceChange,
} from './agentic-wallet-market-swap-accounting-balance-evidence';
import {
  AgenticWalletMarketSwapAccountingBalanceCompletionNotFoundError,
  AgenticWalletMarketSwapAccountingBalanceEvidenceBlockedError,
  AgenticWalletMarketSwapAccountingBalanceEvidenceConflictError,
} from './agentic-wallet-market-swap-accounting-balance-evidence.store';
import { PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceStore } from './prisma-agentic-wallet-market-swap-accounting-balance-evidence.store';

const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const COMPLETION_EVIDENCE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const ACCOUNTING_EVIDENCE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const STATUS_OBSERVATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const OBSERVED_AT = new Date('2026-10-03T12:00:09.000Z');
const RECORDED_AT = new Date('2026-10-03T12:00:10.000Z');

describe('PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceStore', () => {
  it('persists complete balance evidence after reloading durable completion', async () => {
    const harness = repositoryHarness();

    await expect(harness.store.record(evidence())).resolves.toMatchObject({
      stored: {
        id: ACCOUNTING_EVIDENCE_ID,
        evidence: evidence({
          balanceChanges: [
            balanceChanges()[2],
            balanceChanges()[0],
            balanceChanges()[1],
          ],
        }),
        recordedAt: RECORDED_AT,
      },
      replayed: false,
    });
    const createdData = harness.create.mock.calls[0][0].data;
    expect(createdData).toMatchObject({
      id: ACCOUNTING_EVIDENCE_ID,
      financialReconciliationEvidenceId: COMPLETION_EVIDENCE_ID,
      gateId: GATE_ID,
      transactionHash: TRANSACTION_HASH,
      observedAt: OBSERVED_AT,
      recordedAt: RECORDED_AT,
    });
    expect(createdData.requestFingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(harness.financialFindUnique).toHaveBeenCalledTimes(1);
    expect(harness.prismaTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  });

  it('replays semantically identical evidence regardless of balance-change order', async () => {
    const harness = repositoryHarness();
    await harness.store.record(evidence());
    const firstCreate = harness.create.mock.calls[0][0];
    harness.existingFindUnique.mockResolvedValue(
      accountingRow({
        requestFingerprint: firstCreate.data.requestFingerprint,
      }),
    );
    harness.create.mockClear();
    harness.financialFindUnique.mockClear();

    const reordered = evidence({
      balanceChanges: [...balanceChanges()].reverse(),
    });
    await expect(harness.store.record(reordered)).resolves.toMatchObject({
      stored: { id: ACCOUNTING_EVIDENCE_ID },
      replayed: true,
    });
    expect(harness.create).not.toHaveBeenCalled();
    expect(harness.financialFindUnique).not.toHaveBeenCalled();
  });

  it('rejects a different balance payload for the same gate', async () => {
    const harness = repositoryHarness();
    harness.existingFindUnique.mockResolvedValue(
      accountingRow({ requestFingerprint: 'f'.repeat(64) }),
    );

    await expect(harness.store.record(evidence())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingBalanceEvidenceConflictError,
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects absent durable financial completion', async () => {
    const harness = repositoryHarness();
    harness.financialFindUnique.mockResolvedValue(null);

    await expect(harness.store.record(evidence())).rejects.toBeInstanceOf(
      AgenticWalletMarketSwapAccountingBalanceCompletionNotFoundError,
    );
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects malformed balance evidence before persistence access', async () => {
    const harness = repositoryHarness();
    const input = evidence({ balanceChanges: [] });

    const error: unknown = await harness.store
      .record(input)
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(
      AgenticWalletMarketSwapAccountingBalanceEvidenceBlockedError,
    );
    if (
      !(
        error instanceof
        AgenticWalletMarketSwapAccountingBalanceEvidenceBlockedError
      )
    )
      throw error;
    expect(error.blockers).toEqual(['invalid_accounting_balance_evidence']);
    expect(harness.prismaTransaction).not.toHaveBeenCalled();
  });

  it('reassesses and blocks balance evidence that contradicts durable completion', async () => {
    const harness = repositoryHarness();
    const input = evidence({
      transactionHash: `0x${'b'.repeat(64)}`,
    });

    const error: unknown = await harness.store
      .record(input)
      .catch((reason: unknown) => reason);
    expect(error).toBeInstanceOf(
      AgenticWalletMarketSwapAccountingBalanceEvidenceBlockedError,
    );
    if (
      !(
        error instanceof
        AgenticWalletMarketSwapAccountingBalanceEvidenceBlockedError
      )
    )
      throw error;
    expect(error.blockers).toContain('accounting_evidence_identity_mismatch');
    expect(harness.create).not.toHaveBeenCalled();
  });

  it('rejects invalid generated identity and recording time', async () => {
    const invalidId = repositoryHarness(RECORDED_AT, 'not-a-uuid');
    await expect(invalidId.store.record(evidence())).rejects.toThrow(
      'Accounting balance evidence recording metadata is invalid',
    );

    const earlyClock = repositoryHarness(new Date('2026-10-03T12:00:08.999Z'));
    await expect(earlyClock.store.record(evidence())).rejects.toThrow(
      'Accounting balance evidence recording metadata is invalid',
    );
  });

  it('rejects malformed persisted evidence during replay', async () => {
    const harness = repositoryHarness();
    await harness.store.record(evidence());
    const firstCreate = harness.create.mock.calls[0][0];
    harness.existingFindUnique.mockResolvedValue(
      accountingRow({
        requestFingerprint: firstCreate.data.requestFingerprint,
        balanceChanges: [],
      }),
    );

    await expect(harness.store.record(evidence())).rejects.toThrow(
      'Persisted accounting balance evidence is invalid',
    );
  });
});

function repositoryHarness(
  recordedAt = RECORDED_AT,
  nextId = ACCOUNTING_EVIDENCE_ID,
) {
  const existingFindUnique = jest
    .fn<() => Promise<AccountingRow | null>>()
    .mockResolvedValue(null);
  const financialFindUnique = jest
    .fn<() => Promise<FinancialRow | null>>()
    .mockResolvedValue(financialRow());
  const create = jest.fn(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve(accountingRow(data)),
  );
  const tx = {
    $executeRaw: jest.fn<() => Promise<number>>().mockResolvedValue(1),
    realExecutionAccountingBalanceEvidence: {
      findUnique: existingFindUnique,
      create,
    },
    realExecutionFinancialReconciliationEvidence: {
      findUnique: financialFindUnique,
    },
  };
  const prismaTransaction = jest.fn(
    async (callback: (value: typeof tx) => Promise<unknown>) => callback(tx),
  );
  const prisma = {
    $transaction: prismaTransaction,
  } as unknown as PrismaService;
  return {
    create,
    existingFindUnique,
    financialFindUnique,
    prismaTransaction,
    store: new PrismaAgenticWalletMarketSwapAccountingBalanceEvidenceStore(
      prisma,
      () => recordedAt,
      () => nextId,
    ),
  };
}

function evidence(
  overrides: Partial<AgenticWalletMarketSwapAccountingBalanceEvidence> = {},
): AgenticWalletMarketSwapAccountingBalanceEvidence {
  return {
    scope: 'agentic_wallet_market_swap_accounting_balance_evidence',
    completionEvidenceId: COMPLETION_EVIDENCE_ID,
    gateId: GATE_ID,
    transactionHash: TRANSACTION_HASH,
    balanceChanges: balanceChanges(),
    coverageComplete: true,
    observedAt: OBSERVED_AT,
    ...overrides,
  };
}

function balanceChanges(): AgenticWalletMarketSwapBalanceChange[] {
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
    id: COMPLETION_EVIDENCE_ID,
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

function accountingRow(overrides: Record<string, unknown> = {}) {
  return {
    id: ACCOUNTING_EVIDENCE_ID,
    financialReconciliationEvidenceId: COMPLETION_EVIDENCE_ID,
    gateId: GATE_ID,
    transactionHash: TRANSACTION_HASH,
    balanceChanges: balanceChanges(),
    requestFingerprint: 'b'.repeat(64),
    observedAt: OBSERVED_AT,
    recordedAt: RECORDED_AT,
    ...overrides,
  };
}

type FinancialRow = ReturnType<typeof financialRow>;
type AccountingRow = ReturnType<typeof accountingRow>;
