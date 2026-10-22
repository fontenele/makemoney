import {
  FundingConversionStatusContext,
  assessAgenticWalletFundingConversionStatusResponse,
} from './agentic-wallet-funding-conversion-status-response';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';

describe('assessAgenticWalletFundingConversionStatusResponse', () => {
  it.each([
    ['PENDING', 'pending', false, false, null],
    ['FINISHED', 'finished', true, true, `0x${'a'.repeat(64)}`],
    ['FAILED', 'failed', true, false, null],
  ])(
    'validates %s without claiming financial reconciliation',
    (providerStatus, status, terminal, executionSucceeded, txHash) => {
      const result = assessAgenticWalletFundingConversionStatusResponse(
        context(),
        response({ status: providerStatus, txHash }),
      );

      expect(result).toMatchObject({
        status,
        blockers: [],
        observation: {
          providerStatus,
          terminal,
          executionSucceeded,
          financialReconciliationRequired: true,
          financialReconciliationComplete: false,
          automaticRetryAllowed: false,
        },
      });
    },
  );

  it.each([
    ['order identity', { orderId: 'different' }, 'order_identity_mismatch'],
    ['chain', { chain: '1' }, 'order_payload_mismatch'],
    [
      'direction',
      { toToken: BSC_NATIVE_BNB_ADDRESS },
      'order_payload_mismatch',
    ],
    ['quantity', { fromTokenQty: '0.007' }, 'order_payload_mismatch'],
    ['slippage', { slippage: '0.6' }, 'order_payload_mismatch'],
    ['status', { status: 'CANCELLED' }, 'invalid_order_status'],
    [
      'chronology',
      { updatedTime: '2026-10-22T11:59:00.000Z' },
      'invalid_order_timestamps',
    ],
  ])('blocks mismatched %s evidence', (_label, changed, blocker) => {
    const result = assessAgenticWalletFundingConversionStatusResponse(
      context(),
      response(changed),
    );

    expect(result.status).toBe('invalid');
    expect(result.blockers).toContain(blocker);
    expect(result.observation).toBeNull();
  });

  it('requires a transaction hash for FINISHED', () => {
    const result = assessAgenticWalletFundingConversionStatusResponse(
      context(),
      response({ status: 'FINISHED', txHash: null }),
    );

    expect(result).toMatchObject({
      status: 'invalid',
      blockers: ['invalid_transaction_hash'],
      observation: null,
    });
  });
});

function context(): FundingConversionStatusContext {
  return {
    attemptId: '019a0db1-bfea-7000-8000-000000000002',
    providerOrderId: 'order_123',
    sourceQuantityBnb: '0.008',
    maximumSlippagePercent: '0.5',
  };
}

function response(changed: Record<string, unknown>) {
  return {
    success: true,
    data: {
      total: 1,
      page: 1,
      pageSize: 10,
      list: [
        {
          orderType: 'market',
          orderId: 'order_123',
          chain: '56',
          fromToken: BSC_NATIVE_BNB_ADDRESS,
          toToken: BSC_USDT_ADDRESS,
          fromTokenName: 'BNB',
          toTokenName: 'USDT',
          fromTokenQty: '0.008',
          slippage: '0.5',
          status: 'PENDING',
          txHash: null,
          bookTime: '2026-10-22T12:00:30.000Z',
          updatedTime: '2026-10-22T12:00:31.000Z',
          ...changed,
        },
      ],
    },
  };
}
