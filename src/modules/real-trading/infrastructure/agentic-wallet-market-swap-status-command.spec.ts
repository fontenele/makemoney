import { AgenticWalletMarketSwapSubmissionReceipt } from './agentic-wallet-market-swap-submission-response';
import { prepareAgenticWalletMarketSwapStatusCommand } from './agentic-wallet-market-swap-status-command';

describe('prepareAgenticWalletMarketSwapStatusCommand', () => {
  it('builds the exact read-only order lookup preview', () => {
    expect(prepareAgenticWalletMarketSwapStatusCommand(receipt())).toEqual({
      scope: 'agentic_wallet_market_swap_status_command',
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
    });
  });

  it.each([
    { kind: 'other' },
    { providerId: 'other_provider' },
    { gateId: 'invalid' },
    { providerOrderId: '--status' },
    { providerOrderId: 'order/id' },
    { lifecycleStatus: 'finished' },
    { providerSubmissionAcknowledged: false },
    { terminal: true },
    { executionSucceeded: true },
    { statusLookupRequired: false },
    { automaticRetryAllowed: true },
  ])('rejects a malformed or promoted receipt %#', (overrides) => {
    expect(
      prepareAgenticWalletMarketSwapStatusCommand(
        receipt(overrides as Partial<AgenticWalletMarketSwapSubmissionReceipt>),
      ),
    ).toEqual({
      scope: 'agentic_wallet_market_swap_status_command',
      status: 'blocked',
      blockers: ['invalid_submission_receipt'],
      command: null,
    });
  });
});

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
