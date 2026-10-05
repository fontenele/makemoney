import { AgenticWalletMarketSwapReconciliationState } from './agentic-wallet-market-swap-reconciliation-state.store';
import {
  MAXIMUM_STATUS_LOOKUP_INTERVAL_MS,
  MINIMUM_STATUS_LOOKUP_INTERVAL_MS,
  decideAgenticWalletMarketSwapStatusLookupCadence,
} from './agentic-wallet-market-swap-status-lookup-cadence';

const OBSERVED_AT = new Date('2026-10-05T12:00:06.000Z');
const INTERVAL_MS = 5_000;

describe('decideAgenticWalletMarketSwapStatusLookupCadence', () => {
  it('allows the first status observation without imposing a receipt cooldown', () => {
    expect(
      decideAgenticWalletMarketSwapStatusLookupCadence(
        state(),
        new Date('2026-10-05T12:00:05.000Z'),
        INTERVAL_MS,
      ),
    ).toMatchObject({
      status: 'status_command_preview_ready',
      blockers: [],
      command: {
        arguments: [
          'market-order',
          'list',
          '--orderId',
          '1234567890',
          '--json',
        ],
        readOnly: true,
        executable: false,
      },
      minimumLookupIntervalMs: INTERVAL_MS,
      nextStatusLookupAt: null,
      statusLookupRequired: true,
      providerCallStarted: false,
    });
  });

  it('defers a repeated pending lookup until the minimum interval elapses', () => {
    expect(
      decideAgenticWalletMarketSwapStatusLookupCadence(
        pendingState(),
        new Date('2026-10-05T12:00:10.999Z'),
        INTERVAL_MS,
      ),
    ).toEqual({
      scope: 'agentic_wallet_market_swap_status_lookup_cadence_decision',
      status: 'status_lookup_deferred',
      blockers: [],
      command: null,
      evaluatedAt: new Date('2026-10-05T12:00:10.999Z'),
      minimumLookupIntervalMs: INTERVAL_MS,
      nextStatusLookupAt: new Date('2026-10-05T12:00:11.000Z'),
      statusLookupRequired: true,
      providerCallStarted: false,
      financialReconciliationRequired: true,
      financialReconciliationComplete: false,
      submissionRetryAllowed: false,
    });
  });

  it('allows a pending lookup exactly at the next eligible instant', () => {
    expect(
      decideAgenticWalletMarketSwapStatusLookupCadence(
        pendingState(),
        new Date('2026-10-05T12:00:11.000Z'),
        INTERVAL_MS,
      ),
    ).toMatchObject({
      status: 'status_command_preview_ready',
      blockers: [],
      command: { readOnly: true, executable: false },
      nextStatusLookupAt: new Date('2026-10-05T12:00:11.000Z'),
      statusLookupRequired: true,
      providerCallStarted: false,
    });
  });

  it.each([
    ['finished', terminalState('FINISHED')],
    ['failed', terminalState('FAILED')],
  ])('preserves the terminal stop for a %s state', (_label, value) => {
    expect(
      decideAgenticWalletMarketSwapStatusLookupCadence(
        value,
        new Date(Number.NaN),
        0,
      ),
    ).toEqual({
      scope: 'agentic_wallet_market_swap_status_lookup_cadence_decision',
      status: 'status_lookup_not_required',
      blockers: [],
      command: null,
      evaluatedAt: null,
      minimumLookupIntervalMs: null,
      nextStatusLookupAt: null,
      statusLookupRequired: false,
      providerCallStarted: false,
      financialReconciliationRequired: true,
      financialReconciliationComplete: false,
      submissionRetryAllowed: false,
    });
  });

  it.each([
    0,
    MINIMUM_STATUS_LOOKUP_INTERVAL_MS - 1,
    1_000.5,
    MAXIMUM_STATUS_LOOKUP_INTERVAL_MS + 1,
    Number.NaN,
  ])('blocks invalid minimum interval %#', (minimumIntervalMs) => {
    expect(
      decideAgenticWalletMarketSwapStatusLookupCadence(
        pendingState(),
        new Date('2026-10-05T12:00:11.000Z'),
        minimumIntervalMs,
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['invalid_minimum_lookup_interval'],
      command: null,
      providerCallStarted: false,
    });
  });

  it.each([
    new Date(Number.NaN),
    new Date('2026-10-05T12:00:04.999Z'),
    new Date('2026-10-05T12:00:05.999Z'),
  ])('blocks invalid or regressed evaluation time %#', (evaluatedAt) => {
    expect(
      decideAgenticWalletMarketSwapStatusLookupCadence(
        pendingState(),
        evaluatedAt,
        INTERVAL_MS,
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['invalid_evaluation_time'],
      command: null,
      providerCallStarted: false,
    });
  });

  it('blocks malformed reconciliation evidence before cadence evaluation', () => {
    expect(
      decideAgenticWalletMarketSwapStatusLookupCadence(
        state({ gateId: 'invalid' }),
        new Date('2026-10-05T12:00:11.000Z'),
        INTERVAL_MS,
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: ['invalid_reconciliation_state'],
      command: null,
      providerCallStarted: false,
    });
  });
});

function pendingState(): AgenticWalletMarketSwapReconciliationState {
  return state({
    phase: 'provider_pending',
    providerStatus: 'PENDING',
    latestObservationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    latestObservationRecordedAt: OBSERVED_AT,
  });
}

function terminalState(
  providerStatus: 'FINISHED' | 'FAILED',
): AgenticWalletMarketSwapReconciliationState {
  return state({
    phase:
      providerStatus === 'FINISHED'
        ? 'provider_finished_financial_reconciliation_required'
        : 'provider_failed',
    providerStatus,
    transactionHash:
      providerStatus === 'FINISHED' ? `0x${'a'.repeat(64)}` : null,
    latestObservationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    latestObservationRecordedAt: OBSERVED_AT,
    terminal: true,
    executionSucceeded: providerStatus === 'FINISHED',
    statusLookupRequired: false,
  });
}

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
    receiptRecordedAt: new Date('2026-10-05T12:00:05.000Z'),
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
