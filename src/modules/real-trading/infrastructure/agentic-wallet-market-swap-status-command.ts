import {
  AgenticWalletMarketSwapSubmissionReceipt,
  isValidAgenticWalletMarketSwapSubmissionReceipt,
} from './agentic-wallet-market-swap-submission-response';

export interface AgenticWalletMarketSwapStatusCommandPreview {
  readonly kind: 'agentic_wallet_market_swap_status_command_preview';
  readonly gateId: string;
  readonly providerOrderId: string;
  readonly arguments: readonly string[];
  readonly readOnly: true;
  readonly executable: false;
  readonly providerCallStarted: false;
  readonly submissionRetryAllowed: false;
}

export interface AgenticWalletMarketSwapStatusCommandAssessment {
  readonly scope: 'agentic_wallet_market_swap_status_command';
  readonly status: 'status_command_preview_ready' | 'blocked';
  readonly blockers: readonly ['invalid_submission_receipt'] | readonly [];
  readonly command: AgenticWalletMarketSwapStatusCommandPreview | null;
}

export function prepareAgenticWalletMarketSwapStatusCommand(
  receipt: AgenticWalletMarketSwapSubmissionReceipt,
): AgenticWalletMarketSwapStatusCommandAssessment {
  if (!isValidAgenticWalletMarketSwapSubmissionReceipt(receipt)) {
    return {
      scope: 'agentic_wallet_market_swap_status_command',
      status: 'blocked',
      blockers: ['invalid_submission_receipt'],
      command: null,
    };
  }

  return {
    scope: 'agentic_wallet_market_swap_status_command',
    status: 'status_command_preview_ready',
    blockers: [],
    command: {
      kind: 'agentic_wallet_market_swap_status_command_preview',
      gateId: receipt.gateId,
      providerOrderId: receipt.providerOrderId,
      arguments: [
        'market-order',
        'list',
        '--orderId',
        receipt.providerOrderId,
        '--json',
      ],
      readOnly: true,
      executable: false,
      providerCallStarted: false,
      submissionRetryAllowed: false,
    },
  };
}
