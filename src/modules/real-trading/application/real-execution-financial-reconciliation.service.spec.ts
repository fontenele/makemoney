import { jest } from '@jest/globals';

import {
  InvalidRealExecutionFinancialReconciliationRequestError,
  RealExecutionFinancialReconciliationService,
} from './real-execution-financial-reconciliation.service';
import { AgenticWalletMarketSwapFinancialReconciliationEvidenceStore } from '../infrastructure/agentic-wallet-market-swap-financial-reconciliation-evidence.store';

const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OBSERVATION_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const EVIDENCE_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;
const USDT = '0x55d398326f99059ff775485246999027b3197955';
const BTCB = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';

describe('RealExecutionFinancialReconciliationService', () => {
  it('records complete explicit evidence and returns the completion projection', async () => {
    const record = jest.fn((evidence) =>
      Promise.resolve({
        stored: {
          id: EVIDENCE_ID,
          evidence,
          recordedAt: new Date('2026-10-26T18:00:01.000Z'),
        },
        replayed: false,
      }),
    );
    const service = new RealExecutionFinancialReconciliationService({
      record,
    } as AgenticWalletMarketSwapFinancialReconciliationEvidenceStore);

    await expect(service.reconcile(request())).resolves.toMatchObject({
      scope: 'real_execution_financial_reconciliation',
      status: 'financial_reconciliation_complete',
      replayed: false,
      providerCallStarted: false,
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
      completion: {
        evidenceId: EVIDENCE_ID,
        gateId: GATE_ID,
        actualReceivedQuantity: '0.000071',
      },
    });
    expect(record).toHaveBeenCalledWith(
      expect.objectContaining({
        observedAt: new Date('2026-10-26T18:00:00.000Z'),
      }),
    );
  });

  it.each([
    null,
    {},
    { ...request(), extra: true },
    { ...request(), gateId: 'invalid' },
    { ...request(), observedAt: '2026-10-26T18:00:00Z' },
    { ...request(), providerFeeCoverageComplete: false },
  ])('rejects malformed input before durable access %#', async (input) => {
    const record = jest.fn();
    const service = new RealExecutionFinancialReconciliationService({
      record,
    } as unknown as AgenticWalletMarketSwapFinancialReconciliationEvidenceStore);

    await expect(service.reconcile(input)).rejects.toBeInstanceOf(
      InvalidRealExecutionFinancialReconciliationRequestError,
    );
    expect(record).not.toHaveBeenCalled();
  });

  it('preserves immutable replay without provider access', async () => {
    const record = jest.fn((evidence) =>
      Promise.resolve({
        stored: {
          id: EVIDENCE_ID,
          evidence,
          recordedAt: new Date('2026-10-26T18:00:01.000Z'),
        },
        replayed: true,
      }),
    );
    const service = new RealExecutionFinancialReconciliationService({
      record,
    } as AgenticWalletMarketSwapFinancialReconciliationEvidenceStore);

    await expect(service.reconcile(request())).resolves.toMatchObject({
      replayed: true,
      providerCallStarted: false,
    });
    expect(record).toHaveBeenCalledTimes(1);
  });
});

function request() {
  return {
    scope: 'agentic_wallet_market_swap_financial_reconciliation_evidence',
    providerId: 'agentic_wallet',
    chainId: '56',
    gateId: GATE_ID,
    providerOrderId: '1234567890',
    statusObservationId: OBSERVATION_ID,
    transactionHash: TRANSACTION_HASH,
    sourceTokenAddress: USDT,
    targetTokenAddress: BTCB,
    submittedSourceQuantity: '5',
    actualTargetReceivedQuantity: '0.000071',
    providerFeeComponents: [],
    networkFeeAsset: 'BNB',
    networkFeeQuantity: '0.0003',
    transactionReceiptObserved: true,
    targetBalanceDeltaObserved: true,
    providerFeeCoverageComplete: true,
    networkFeeCoverageComplete: true,
    observedAt: '2026-10-26T18:00:00.000Z',
  };
}
