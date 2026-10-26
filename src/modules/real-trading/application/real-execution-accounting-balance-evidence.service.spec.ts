import { jest } from '@jest/globals';

import {
  InvalidRealExecutionAccountingBalanceEvidenceRequestError,
  RealExecutionAccountingBalanceEvidenceService,
} from './real-execution-accounting-balance-evidence.service';
import { AgenticWalletMarketSwapAccountingBalanceEvidenceStore } from '../infrastructure/agentic-wallet-market-swap-accounting-balance-evidence.store';

const COMPLETION_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const STORED_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
const HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';

describe('RealExecutionAccountingBalanceEvidenceService', () => {
  it('records complete exact balance evidence without applying accounting', async () => {
    const record = jest.fn((evidence) =>
      Promise.resolve({
        stored: {
          id: STORED_ID,
          evidence,
          recordedAt: new Date('2026-10-26T18:00:02.000Z'),
        },
        replayed: false,
      }),
    );
    const service = new RealExecutionAccountingBalanceEvidenceService({
      record,
    } as AgenticWalletMarketSwapAccountingBalanceEvidenceStore);

    await expect(service.record(request())).resolves.toMatchObject({
      scope: 'real_execution_accounting_balance_evidence',
      status: 'accounting_balance_evidence_recorded',
      replayed: false,
      providerCallStarted: false,
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
      storedEvidence: { id: STORED_ID },
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        observedAt: new Date('2026-10-26T18:00:01.000Z'),
      }),
    );
  });

  it.each([
    null,
    {},
    { ...request(), extra: true },
    { ...request(), observedAt: '2026-10-26T18:00:01Z' },
    { ...request(), coverageComplete: false },
    { ...request(), balanceChanges: [] },
    {
      ...request(),
      balanceChanges: [
        { ...request().balanceChanges[0], unexpected: true },
        ...request().balanceChanges.slice(1),
      ],
    },
  ])('rejects malformed input before durable access %#', async (input) => {
    const record = jest.fn();
    const service = new RealExecutionAccountingBalanceEvidenceService({
      record,
    } as unknown as AgenticWalletMarketSwapAccountingBalanceEvidenceStore);

    await expect(service.record(input)).rejects.toBeInstanceOf(
      InvalidRealExecutionAccountingBalanceEvidenceRequestError,
    );
    expect(record).not.toHaveBeenCalled();
  });

  it('preserves exact durable replay without provider access', async () => {
    const record = jest.fn((evidence) =>
      Promise.resolve({
        stored: {
          id: STORED_ID,
          evidence,
          recordedAt: new Date('2026-10-26T18:00:02.000Z'),
        },
        replayed: true,
      }),
    );
    const service = new RealExecutionAccountingBalanceEvidenceService({
      record,
    } as AgenticWalletMarketSwapAccountingBalanceEvidenceStore);

    await expect(service.record(request())).resolves.toMatchObject({
      replayed: true,
      providerCallStarted: false,
      accountingMutationComplete: false,
    });
  });
});

function request() {
  return {
    scope: 'agentic_wallet_market_swap_accounting_balance_evidence',
    completionEvidenceId: COMPLETION_ID,
    gateId: GATE_ID,
    transactionHash: HASH,
    balanceChanges: [
      {
        assetType: 'token',
        assetAddress: USDT,
        direction: 'debit',
        beforeQuantity: '100',
        afterQuantity: '95',
        deltaQuantity: '5',
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
    ],
    coverageComplete: true,
    observedAt: '2026-10-26T18:00:01.000Z',
  };
}
