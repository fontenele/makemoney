import { AgenticWalletMarketSwapReconciliationState } from './agentic-wallet-market-swap-reconciliation-state.store';
import { decideAgenticWalletMarketSwapStatusLookup } from './agentic-wallet-market-swap-status-lookup-decision';

const TRANSACTION_HASH = `0x${'a'.repeat(64)}`;

describe('decideAgenticWalletMarketSwapStatusLookup', () => {
  it.each([
    ['awaiting first observation', state()],
    [
      'provider pending',
      state({
        phase: 'provider_pending',
        providerStatus: 'PENDING',
        latestObservationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        latestObservationRecordedAt: new Date('2026-10-03T12:00:06.000Z'),
      }),
    ],
  ])('prepares the exact read-only lookup while %s', (_label, value) => {
    expect(decideAgenticWalletMarketSwapStatusLookup(value)).toEqual({
      scope: 'agentic_wallet_market_swap_status_lookup_decision',
      status: 'status_command_preview_ready',
      blockers: [],
      command: {
        kind: 'agentic_wallet_market_swap_status_command_preview',
        gateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        providerOrderId: '1234567890',
        arguments: [
          'market-order',
          'list',
          '--orderId',
          '1234567890',
          '--json',
        ],
        readOnly: true,
        executable: false,
        providerCallStarted: false,
        submissionRetryAllowed: false,
      },
      statusLookupRequired: true,
      providerCallStarted: false,
      financialReconciliationRequired: true,
      financialReconciliationComplete: false,
      submissionRetryAllowed: false,
    });
  });

  it.each([
    [
      'provider finished',
      state({
        phase: 'provider_finished_financial_reconciliation_required',
        providerStatus: 'FINISHED',
        transactionHash: TRANSACTION_HASH,
        latestObservationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        latestObservationRecordedAt: new Date('2026-10-03T12:00:06.000Z'),
        terminal: true,
        executionSucceeded: true,
        statusLookupRequired: false,
      }),
    ],
    [
      'provider failed',
      state({
        phase: 'provider_failed',
        providerStatus: 'FAILED',
        latestObservationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        latestObservationRecordedAt: new Date('2026-10-03T12:00:06.000Z'),
        terminal: true,
        statusLookupRequired: false,
      }),
    ],
  ])('stops lookup when %s', (_label, value) => {
    expect(decideAgenticWalletMarketSwapStatusLookup(value)).toEqual({
      scope: 'agentic_wallet_market_swap_status_lookup_decision',
      status: 'status_lookup_not_required',
      blockers: [],
      command: null,
      statusLookupRequired: false,
      providerCallStarted: false,
      financialReconciliationRequired: true,
      financialReconciliationComplete: false,
      submissionRetryAllowed: false,
    });
  });

  it.each([
    null,
    {},
    state({ scope: 'other' as never }),
    state({ providerId: 'other' as never }),
    state({ gateId: 'invalid' }),
    state({ providerOrderId: '--unsafe' }),
    state({ receiptRecordedAt: new Date(Number.NaN) }),
    state({ phase: 'provider_pending' }),
    state({ providerStatus: 'PENDING' }),
    state({ latestObservationId: 'invalid' }),
    state({
      latestObservationRecordedAt: new Date('2026-10-03T12:00:04.999Z'),
    }),
    state({ transactionHash: 'not-a-hash' }),
    state({ terminal: true }),
    state({ executionSucceeded: true }),
    state({ statusLookupRequired: false }),
    state({ financialReconciliationRequired: false as true }),
    state({ financialReconciliationComplete: true as false }),
    state({ actualReceivedQuantity: '1' as null }),
    state({ submissionRetryAllowed: true as false }),
    state({
      phase: 'provider_finished_financial_reconciliation_required',
      providerStatus: 'FINISHED',
      latestObservationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      latestObservationRecordedAt: new Date('2026-10-03T12:00:06.000Z'),
      terminal: true,
      executionSucceeded: true,
      statusLookupRequired: false,
    }),
  ])('blocks malformed reconciliation state %#', (value) => {
    expect(
      decideAgenticWalletMarketSwapStatusLookup(
        value as AgenticWalletMarketSwapReconciliationState,
      ),
    ).toEqual({
      scope: 'agentic_wallet_market_swap_status_lookup_decision',
      status: 'blocked',
      blockers: ['invalid_reconciliation_state'],
      command: null,
      statusLookupRequired: false,
      providerCallStarted: false,
      financialReconciliationRequired: true,
      financialReconciliationComplete: false,
      submissionRetryAllowed: false,
    });
  });
});

function state(
  overrides: Partial<AgenticWalletMarketSwapReconciliationState> = {},
): AgenticWalletMarketSwapReconciliationState {
  return {
    scope: 'agentic_wallet_market_swap_reconciliation_state',
    providerId: 'agentic_wallet',
    gateId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    providerOrderId: '1234567890',
    phase: 'awaiting_status_observation',
    providerStatus: null,
    transactionHash: null,
    receiptRecordedAt: new Date('2026-10-03T12:00:05.000Z'),
    latestObservationId: null,
    latestObservationRecordedAt: null,
    terminal: false,
    executionSucceeded: false,
    statusLookupRequired: true,
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    actualReceivedQuantity: null,
    submissionRetryAllowed: false,
    ...overrides,
  };
}
