import { jest } from '@jest/globals';

import { AgenticWalletMarketSwapAccountingBalanceEvidenceReadStore } from '../infrastructure/agentic-wallet-market-swap-accounting-balance-evidence.store';
import { AgenticWalletMarketSwapAccountingMutationCommitmentStore } from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-commitment.store';
import {
  InvalidRealExecutionAccountingMutationCommitmentRequestError,
  RealExecutionAccountingMutationCommitmentService,
} from './real-execution-accounting-mutation-commitment.service';

const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const MUTATION_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const EVIDENCE_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const COMPLETION_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const PREPARED_AT = new Date('2026-10-26T18:00:11.000Z');

describe('RealExecutionAccountingMutationCommitmentService', () => {
  it('derives and records an inert commitment from durable evidence', async () => {
    const harness = serviceHarness();

    await expect(harness.service.prepare(request())).resolves.toMatchObject({
      scope: 'real_execution_accounting_mutation_commitment',
      status: 'accounting_mutation_commitment_recorded',
      replayed: false,
      providerCallStarted: false,
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationAuthorized: false,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
      storedCommitment: {
        commitment: {
          mutationId: MUTATION_ID,
          plan: { accountingEvidenceId: EVIDENCE_ID, gateId: GATE_ID },
        },
      },
    });
    expect(harness.read).toHaveBeenCalledWith(GATE_ID);
    expect(harness.record).toHaveBeenCalledWith(
      expect.objectContaining({
        mutationId: MUTATION_ID,
        preparedAt: PREPARED_AT,
        accountingMutationAuthorized: false,
      }),
    );
  });

  it.each([
    null,
    {},
    { ...request(), extra: true },
    { ...request(), gateId: 'invalid' },
    { ...request(), mutationId: 'EEEEEEEE-EEEE-4EEE-8EEE-EEEEEEEEEEEE' },
  ])('rejects malformed input before durable access %#', async (input) => {
    const harness = serviceHarness();

    await expect(harness.service.prepare(input)).rejects.toBeInstanceOf(
      InvalidRealExecutionAccountingMutationCommitmentRequestError,
    );
    expect(harness.read).not.toHaveBeenCalled();
    expect(harness.record).not.toHaveBeenCalled();
  });

  it('stops when durable accounting evidence is absent', async () => {
    const harness = serviceHarness(null);

    await expect(harness.service.prepare(request())).rejects.toThrow(
      'Durable accounting balance evidence was not found',
    );
    expect(harness.record).not.toHaveBeenCalled();
  });

  it('preserves immutable replay without authorizing accounting', async () => {
    const harness = serviceHarness(undefined, true);

    await expect(harness.service.prepare(request())).resolves.toMatchObject({
      replayed: true,
      accountingMutationAuthorized: false,
      accountingMutationComplete: false,
    });
  });
});

function serviceHarness(
  stored: ReturnType<typeof storedEvidence> | null = storedEvidence(),
  replayed = false,
) {
  const read = jest
    .fn<() => Promise<typeof stored>>()
    .mockResolvedValue(stored);
  const record = jest.fn((commitment) =>
    Promise.resolve({
      stored: {
        commitment,
        recordedAt: new Date('2026-10-26T18:00:12.000Z'),
      },
      replayed,
    }),
  );
  return {
    read,
    record,
    service: new RealExecutionAccountingMutationCommitmentService(
      {
        getByGateId: read,
      } as AgenticWalletMarketSwapAccountingBalanceEvidenceReadStore,
      { record } as AgenticWalletMarketSwapAccountingMutationCommitmentStore,
      () => PREPARED_AT,
    ),
  };
}

function request() {
  return { gateId: GATE_ID, mutationId: MUTATION_ID };
}

function storedEvidence() {
  return {
    id: EVIDENCE_ID,
    evidence: {
      scope: 'agentic_wallet_market_swap_accounting_balance_evidence' as const,
      completionEvidenceId: COMPLETION_ID,
      gateId: GATE_ID,
      transactionHash: TRANSACTION_HASH,
      balanceChanges: [
        {
          assetType: 'token' as const,
          assetAddress: USDT,
          direction: 'debit' as const,
          beforeQuantity: '100',
          afterQuantity: '94.995',
          deltaQuantity: '5.005',
        },
        {
          assetType: 'token' as const,
          assetAddress: BTCB,
          direction: 'credit' as const,
          beforeQuantity: '0',
          afterQuantity: '0.000071',
          deltaQuantity: '0.000071',
        },
        {
          assetType: 'native' as const,
          assetSymbol: 'BNB',
          direction: 'debit' as const,
          beforeQuantity: '1',
          afterQuantity: '0.9997',
          deltaQuantity: '0.0003',
        },
      ],
      coverageComplete: true as const,
      observedAt: new Date('2026-10-26T18:00:09.000Z'),
    },
    recordedAt: new Date('2026-10-26T18:00:10.000Z'),
  };
}
