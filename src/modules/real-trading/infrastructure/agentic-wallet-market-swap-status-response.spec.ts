import { StoredRealExecutionSubmissionGate } from '../application/real-execution-submission-gate-store';
import { AgenticWalletMarketSwapSubmissionReceipt } from './agentic-wallet-market-swap-submission-response';
import { assessAgenticWalletMarketSwapStatusResponse } from './agentic-wallet-market-swap-status-response';

const TRANSACTION_HASH = `0x${'AB'.repeat(32)}`;

describe('assessAgenticWalletMarketSwapStatusResponse', () => {
  it('keeps a pending order non-terminal and requiring another lookup', () => {
    expect(
      assessAgenticWalletMarketSwapStatusResponse(
        gate(),
        receipt(),
        response(),
      ),
    ).toEqual({
      scope: 'agentic_wallet_market_swap_status_response',
      status: 'pending',
      blockers: [],
      observation: {
        kind: 'agentic_wallet_market_swap_status_observation',
        providerId: 'agentic_wallet',
        gateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        providerOrderId: '1234567890',
        providerStatus: 'PENDING',
        transactionHash: null,
        bookedAt: new Date('2026-10-03T12:00:00.000Z'),
        updatedAt: new Date('2026-10-03T12:00:01.000Z'),
        terminal: false,
        executionSucceeded: false,
        statusLookupRequired: true,
        financialReconciliationRequired: true,
        financialReconciliationComplete: false,
        actualReceivedQuantity: null,
        submissionRetryAllowed: false,
      },
      financialReconciliationRequired: true,
      submissionRetryAllowed: false,
    });
  });

  it('accepts FINISHED only with a valid transaction hash without claiming financial reconciliation', () => {
    const result = assessAgenticWalletMarketSwapStatusResponse(
      gate(),
      receipt(),
      response({ status: 'FINISHED', txHash: TRANSACTION_HASH }),
    );

    expect(result).toMatchObject({
      status: 'finished',
      blockers: [],
      financialReconciliationRequired: true,
      submissionRetryAllowed: false,
      observation: {
        providerStatus: 'FINISHED',
        transactionHash: TRANSACTION_HASH.toLowerCase(),
        terminal: true,
        executionSucceeded: true,
        statusLookupRequired: false,
        financialReconciliationComplete: false,
        actualReceivedQuantity: null,
      },
    });
  });

  it('classifies FAILED as terminal without allowing a submission retry', () => {
    expect(
      assessAgenticWalletMarketSwapStatusResponse(
        gate(),
        receipt(),
        response({ status: 'FAILED' }),
      ),
    ).toMatchObject({
      status: 'failed',
      blockers: [],
      submissionRetryAllowed: false,
      observation: {
        providerStatus: 'FAILED',
        transactionHash: null,
        terminal: true,
        executionSucceeded: false,
        statusLookupRequired: false,
        financialReconciliationComplete: false,
      },
    });
  });

  it('accepts equivalent decimal and case-insensitive address representations', () => {
    const result = assessAgenticWalletMarketSwapStatusResponse(
      gate(),
      receipt(),
      response({
        fromToken: '0x55D398326F99059FF775485246999027B3197955',
        toToken: '0x7130D2A12B9BCBFAE4F2634D864A1EE1CE3EAD9C',
        fromTokenQty: '5.000',
        slippage: '0.1000',
        providerMetadata: 'ignored',
        toTokenQty: '0.000031',
      }),
    );

    expect(result.status).toBe('pending');
    expect(result.observation?.actualReceivedQuantity).toBeNull();
  });

  it.each([null, [], {}, { success: true }, { success: 'true', data: {} }])(
    'rejects an invalid response envelope %#',
    (value) => {
      const result = assessAgenticWalletMarketSwapStatusResponse(
        gate(),
        receipt(),
        value,
      );

      expect(result.status).toBe('status_response_invalid');
      expect(result.blockers).toContain('invalid_response_envelope');
      expect(result.observation).toBeNull();
      expect(result.submissionRetryAllowed).toBe(false);
    },
  );

  it('rejects an explicit provider failure without retrying submission', () => {
    expect(
      assessAgenticWalletMarketSwapStatusResponse(gate(), receipt(), {
        success: false,
        data: { message: 'lookup failed' },
      }),
    ).toMatchObject({
      status: 'status_response_invalid',
      blockers: ['provider_reported_failure'],
      observation: null,
      submissionRetryAllowed: false,
    });
  });

  it.each([
    { total: 0 },
    { page: 2 },
    { pageSize: 0 },
    { pageSize: 101 },
    { list: [] },
    { list: [statusRow(), statusRow()] },
    { list: [null] },
  ])('rejects an ambiguous lookup payload %#', (dataOverrides) => {
    const result = assessAgenticWalletMarketSwapStatusResponse(
      gate(),
      receipt(),
      response({}, dataOverrides),
    );

    expect(result.blockers).toContain('invalid_order_lookup_payload');
    expect(result.observation).toBeNull();
  });

  it.each([{ orderType: 'limit' }, { orderId: 'different-order' }])(
    'rejects an order identity mismatch %#',
    (rowOverrides) => {
      const result = assessAgenticWalletMarketSwapStatusResponse(
        gate(),
        receipt(),
        response(rowOverrides),
      );

      expect(result.blockers).toContain('order_identity_mismatch');
      expect(result.observation).toBeNull();
    },
  );

  it.each([
    { chain: '1' },
    { fromToken: '0x1111111111111111111111111111111111111111' },
    { toToken: '0x1111111111111111111111111111111111111111' },
    { fromTokenName: 'BUSD' },
    { toTokenName: 'WBTC' },
    { fromTokenQty: '5.1' },
    { fromTokenQty: 5 },
    { slippage: '0.2' },
    { slippage: 0.1 },
  ])('rejects an order payload mismatch %#', (rowOverrides) => {
    const result = assessAgenticWalletMarketSwapStatusResponse(
      gate(),
      receipt(),
      response(rowOverrides),
    );

    expect(result.blockers).toContain('order_payload_mismatch');
    expect(result.observation).toBeNull();
  });

  it.each(['pending', 'COMPLETED', '', null])(
    'rejects an unknown provider status %#',
    (status) => {
      const result = assessAgenticWalletMarketSwapStatusResponse(
        gate(),
        receipt(),
        response({ status }),
      );

      expect(result.blockers).toContain('invalid_order_status');
      expect(result.observation).toBeNull();
    },
  );

  it.each([
    { bookTime: '2026-10-03 12:00:00' },
    { updatedTime: 'not-a-date' },
    {
      bookTime: '2026-10-03T12:00:02.000Z',
      updatedTime: '2026-10-03T12:00:01.000Z',
    },
  ])('rejects invalid or reversed provider timestamps %#', (rowOverrides) => {
    const result = assessAgenticWalletMarketSwapStatusResponse(
      gate(),
      receipt(),
      response(rowOverrides),
    );

    expect(result.blockers).toContain('invalid_order_timestamps');
    expect(result.observation).toBeNull();
  });

  it.each([
    { status: 'FINISHED', txHash: null },
    { status: 'FINISHED', txHash: '0x1234' },
    { status: 'PENDING', txHash: 'invalid' },
    { status: 'FAILED', txHash: 123 },
  ])('rejects an invalid transaction hash %#', (rowOverrides) => {
    const result = assessAgenticWalletMarketSwapStatusResponse(
      gate(),
      receipt(),
      response(rowOverrides),
    );

    expect(result.blockers).toContain('invalid_transaction_hash');
    expect(result.observation).toBeNull();
  });

  it('rejects a gate and receipt correlation mismatch', () => {
    const result = assessAgenticWalletMarketSwapStatusResponse(
      gate(),
      receipt({ gateId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' }),
      response(),
    );

    expect(result.blockers).toContain('gate_receipt_mismatch');
    expect(result.observation).toBeNull();
  });

  it('rejects malformed gate and receipt evidence', () => {
    const result = assessAgenticWalletMarketSwapStatusResponse(
      gate({ sourceQuantity: '5.0' }),
      receipt({ terminal: true as false }),
      response(),
    );

    expect(result.blockers).toContain('invalid_submission_gate');
    expect(result.blockers).toContain('invalid_submission_receipt');
    expect(result.observation).toBeNull();
  });
});

function response(
  rowOverrides: Record<string, unknown> = {},
  dataOverrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    success: true,
    data: {
      total: 1,
      page: 1,
      pageSize: 20,
      list: [statusRow(rowOverrides)],
      ...dataOverrides,
    },
  };
}

function statusRow(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    orderType: 'market',
    orderId: '1234567890',
    chain: '56',
    fromToken: '0x55d398326f99059ff775485246999027b3197955',
    fromTokenName: 'USDT',
    fromTokenQty: '5',
    toToken: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
    toTokenName: 'BTCB',
    status: 'PENDING',
    slippage: '0.1',
    txHash: null,
    bookTime: '2026-10-03T20:00:00+08:00',
    updatedTime: '2026-10-03T20:00:01+08:00',
    ...overrides,
  };
}

function receipt(
  overrides: Partial<AgenticWalletMarketSwapSubmissionReceipt> = {},
): AgenticWalletMarketSwapSubmissionReceipt {
  return {
    kind: 'agentic_wallet_market_swap_submission_receipt',
    providerId: 'agentic_wallet',
    gateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    providerOrderId: '1234567890',
    lifecycleStatus: 'pending_confirmation',
    providerSubmissionAcknowledged: true,
    terminal: false,
    executionSucceeded: false,
    statusLookupRequired: true,
    automaticRetryAllowed: false,
    ...overrides,
  };
}

function gate(
  overrides: Partial<StoredRealExecutionSubmissionGate> = {},
): StoredRealExecutionSubmissionGate {
  return {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    confirmationId: '88888888-8888-4888-8888-888888888888',
    approvalId: '77777777-7777-4777-8777-777777777777',
    reservationId: '33333333-3333-4333-8333-333333333333',
    armId: '55555555-5555-4555-8555-555555555555',
    submissionPlanId: '99999999-9999-4999-8999-999999999999',
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: '11111111-1111-4111-8111-111111111111',
    quoteId: '22222222-2222-4222-8222-222222222222',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: 'c'.repeat(64),
    emergencyStopChangeId: 'real-trading-stop-clear-1',
    sourceTokenAddress: '0x55d398326f99059ff775485246999027b3197955',
    targetTokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
    sourceQuantity: '5',
    maximumSlippagePercent: '0.1',
    mevProtection: true,
    gasLevel: 'MEDIUM',
    status: 'prepared_not_submitted',
    emergencyStopRecheckedAt: new Date('2026-10-03T12:00:04.000Z'),
    confirmationConsumedAt: new Date('2026-10-03T12:00:04.000Z'),
    expiresAt: new Date('2026-10-03T12:00:07.000Z'),
    createdAt: new Date('2026-10-03T12:00:04.100Z'),
    atomicGateSatisfied: true,
    confirmationConsumed: true,
    providerSubmissionStarted: false,
    submissionAuthorized: false,
    ...overrides,
  };
}
