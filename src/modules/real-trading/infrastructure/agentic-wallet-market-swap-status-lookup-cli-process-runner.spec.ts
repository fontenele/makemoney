import { validateAgenticWalletCliVersion } from './agentic-wallet-cli-version';
import { AgenticWalletMarketSwapReconciliationState } from './agentic-wallet-market-swap-reconciliation-state.store';
import {
  AgenticWalletMarketSwapStatusLookupCliProcessRunner,
  buildAgenticWalletMarketSwapStatusLookupArguments,
} from './agentic-wallet-market-swap-status-lookup-cli-process-runner';
import { decideAgenticWalletMarketSwapStatusLookup } from './agentic-wallet-market-swap-status-lookup-decision';
import {
  AgenticWalletMarketSwapStatusLookupCommand,
  prepareAgenticWalletMarketSwapStatusLookupCommand,
} from './agentic-wallet-market-swap-status-lookup-runner';

describe('AgenticWalletMarketSwapStatusLookupCliProcessRunner', () => {
  it('accepts only bounded process timeouts', () => {
    expect(
      () => new AgenticWalletMarketSwapStatusLookupCliProcessRunner(999),
    ).toThrow('Agentic Wallet CLI timeout must be between 1000 and 30000 ms');
    expect(
      () => new AgenticWalletMarketSwapStatusLookupCliProcessRunner(30001),
    ).toThrow('Agentic Wallet CLI timeout must be between 1000 and 30000 ms');
    expect(
      () => new AgenticWalletMarketSwapStatusLookupCliProcessRunner(1000),
    ).not.toThrow();
    expect(
      () => new AgenticWalletMarketSwapStatusLookupCliProcessRunner(30000),
    ).not.toThrow();
  });
});

describe('buildAgenticWalletMarketSwapStatusLookupArguments', () => {
  it('maps only the read-only order lookup to a closed argument array', () => {
    expect(
      buildAgenticWalletMarketSwapStatusLookupArguments(command()),
    ).toEqual(['market-order', 'list', '--orderId', '1234567890', '--json']);
  });

  it.each([
    '',
    '--status',
    'order/id',
    'order id',
    '../order',
    'order\\id',
    'a'.repeat(257),
  ])('rejects unsafe provider order identity %p', (providerOrderId) => {
    expect(() =>
      buildAgenticWalletMarketSwapStatusLookupArguments(
        command({ providerOrderId }),
      ),
    ).toThrow('status lookup order identity is unsafe');
  });

  it('rejects every command kind outside the one-item allowlist', () => {
    expect(() =>
      buildAgenticWalletMarketSwapStatusLookupArguments(
        command({ kind: 'market_order_swap' as never }),
      ),
    ).toThrow('status lookup command is unsupported');
  });
});

describe('prepareAgenticWalletMarketSwapStatusLookupCommand', () => {
  it('converts only a lookup-ready decision to the one-item command contract', () => {
    const ready = decideAgenticWalletMarketSwapStatusLookup(state());
    expect(prepareAgenticWalletMarketSwapStatusLookupCommand(ready)).toEqual({
      kind: 'market_order_status_lookup',
      providerOrderId: '1234567890',
    });

    const terminal = decideAgenticWalletMarketSwapStatusLookup(
      state({
        phase: 'provider_failed',
        providerStatus: 'FAILED',
        latestObservationId: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        latestObservationRecordedAt: new Date('2026-10-03T12:00:06.000Z'),
        terminal: true,
        statusLookupRequired: false,
      }),
    );
    expect(
      prepareAgenticWalletMarketSwapStatusLookupCommand(terminal),
    ).toBeNull();
  });
});

describe('validateAgenticWalletCliVersion for status lookup', () => {
  it('accepts only the pinned successful CLI contract', () => {
    expect(() =>
      validateAgenticWalletCliVersion(
        {
          success: true,
          data: { currentCliVersion: '1.10.0', needUpdateCli: false },
        },
        'status lookup',
      ),
    ).not.toThrow();
    expect(() =>
      validateAgenticWalletCliVersion(
        {
          success: true,
          data: { currentCliVersion: '1.11.0', needUpdateCli: false },
        },
        'status lookup',
      ),
    ).toThrow('does not match the pinned version');
    expect(() =>
      validateAgenticWalletCliVersion(null, 'status lookup'),
    ).toThrow('status lookup CLI version response is invalid');
  });
});

function command(
  overrides: Partial<AgenticWalletMarketSwapStatusLookupCommand> = {},
): AgenticWalletMarketSwapStatusLookupCommand {
  return {
    kind: 'market_order_status_lookup',
    providerOrderId: '1234567890',
    ...overrides,
  };
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
