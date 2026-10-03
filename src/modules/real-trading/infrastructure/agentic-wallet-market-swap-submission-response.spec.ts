import { assessAgenticWalletMarketSwapSubmissionResponse } from './agentic-wallet-market-swap-submission-response';

const GATE_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

describe('assessAgenticWalletMarketSwapSubmissionResponse', () => {
  it('classifies an order id only as submitted and pending confirmation', () => {
    expect(
      assessAgenticWalletMarketSwapSubmissionResponse(GATE_ID, {
        success: true,
        data: { orderId: '1234567890' },
      }),
    ).toEqual({
      scope: 'agentic_wallet_market_swap_submission_response',
      status: 'submitted_pending_confirmation',
      blockers: [],
      receipt: {
        kind: 'agentic_wallet_market_swap_submission_receipt',
        providerId: 'agentic_wallet',
        gateId: GATE_ID,
        providerOrderId: '1234567890',
        lifecycleStatus: 'pending_confirmation',
        providerSubmissionAcknowledged: true,
        terminal: false,
        executionSucceeded: false,
        statusLookupRequired: true,
        automaticRetryAllowed: false,
      },
      executionSucceeded: false,
      reconciliationRequired: true,
      automaticRetryAllowed: false,
    });
  });

  it('accepts additive provider metadata without trusting it as execution state', () => {
    const result = assessAgenticWalletMarketSwapSubmissionResponse(GATE_ID, {
      success: true,
      data: { orderId: 'order_ABC-123', status: 'FINISHED' },
      traceId: 'provider-trace',
    });

    expect(result.status).toBe('submitted_pending_confirmation');
    expect(result.receipt).toMatchObject({
      providerOrderId: 'order_ABC-123',
      lifecycleStatus: 'pending_confirmation',
      terminal: false,
      executionSucceeded: false,
    });
  });

  it.each([
    null,
    [],
    {},
    { success: true },
    { data: { orderId: '123' } },
    { success: 'true', data: { orderId: '123' } },
  ])(
    'treats an invalid response envelope as an unknown outcome %#',
    (value) => {
      const result = assessAgenticWalletMarketSwapSubmissionResponse(
        GATE_ID,
        value,
      );
      expect(result).toMatchObject({
        status: 'submission_outcome_unknown',
        receipt: null,
        executionSucceeded: false,
        reconciliationRequired: true,
        automaticRetryAllowed: false,
      });
      expect(result.blockers).toContain('invalid_response_envelope');
    },
  );

  it('treats an explicit provider failure as unknown and non-retriable', () => {
    expect(
      assessAgenticWalletMarketSwapSubmissionResponse(GATE_ID, {
        success: false,
        data: { message: 'rejected' },
      }),
    ).toMatchObject({
      status: 'submission_outcome_unknown',
      blockers: ['provider_reported_failure'],
      receipt: null,
      automaticRetryAllowed: false,
    });
  });

  it.each([
    undefined,
    null,
    123,
    '',
    ' order',
    'order id',
    `order${String.fromCharCode(10)}id`,
    'x'.repeat(257),
  ])('rejects an unsafe provider order id %#', (orderId: unknown) => {
    expect(
      assessAgenticWalletMarketSwapSubmissionResponse(GATE_ID, {
        success: true,
        data: { orderId },
      }),
    ).toMatchObject({
      status: 'submission_outcome_unknown',
      blockers: ['invalid_provider_order_id'],
      receipt: null,
      automaticRetryAllowed: false,
    });
  });

  it('rejects an invalid durable gate correlation without trusting the order id', () => {
    expect(
      assessAgenticWalletMarketSwapSubmissionResponse('invalid', {
        success: true,
        data: { orderId: '1234567890' },
      }),
    ).toMatchObject({
      status: 'submission_outcome_unknown',
      blockers: ['invalid_gate_id'],
      receipt: null,
      executionSucceeded: false,
      reconciliationRequired: true,
      automaticRetryAllowed: false,
    });
  });
});
