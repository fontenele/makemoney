import {
  AgenticWalletMarketSwapReconciliationState,
  isValidAgenticWalletMarketSwapReconciliationState,
} from './agentic-wallet-market-swap-reconciliation-state.store';
import {
  AgenticWalletMarketSwapStatusCommandPreview,
  prepareAgenticWalletMarketSwapStatusCommand,
} from './agentic-wallet-market-swap-status-command';

export interface AgenticWalletMarketSwapStatusLookupDecision {
  readonly scope: 'agentic_wallet_market_swap_status_lookup_decision';
  readonly status:
    'status_command_preview_ready' | 'status_lookup_not_required' | 'blocked';
  readonly blockers: readonly ['invalid_reconciliation_state'] | readonly [];
  readonly command: AgenticWalletMarketSwapStatusCommandPreview | null;
  readonly statusLookupRequired: boolean;
  readonly providerCallStarted: false;
  readonly financialReconciliationRequired: true;
  readonly financialReconciliationComplete: false;
  readonly submissionRetryAllowed: false;
}

export function decideAgenticWalletMarketSwapStatusLookup(
  state: AgenticWalletMarketSwapReconciliationState,
): AgenticWalletMarketSwapStatusLookupDecision {
  if (!isValidAgenticWalletMarketSwapReconciliationState(state)) {
    return result('blocked', ['invalid_reconciliation_state'], null, false);
  }
  if (!state.statusLookupRequired) {
    return result('status_lookup_not_required', [], null, false);
  }
  const preview = prepareAgenticWalletMarketSwapStatusCommand({
    kind: 'agentic_wallet_market_swap_submission_receipt',
    providerId: 'agentic_wallet',
    gateId: state.gateId,
    providerOrderId: state.providerOrderId,
    lifecycleStatus: 'pending_confirmation',
    providerSubmissionAcknowledged: true,
    terminal: false,
    executionSucceeded: false,
    statusLookupRequired: true,
    automaticRetryAllowed: false,
  });
  if (preview.command === null) {
    return result('blocked', ['invalid_reconciliation_state'], null, false);
  }
  return result('status_command_preview_ready', [], preview.command, true);
}

function result(
  status: AgenticWalletMarketSwapStatusLookupDecision['status'],
  blockers: AgenticWalletMarketSwapStatusLookupDecision['blockers'],
  command: AgenticWalletMarketSwapStatusCommandPreview | null,
  statusLookupRequired: boolean,
): AgenticWalletMarketSwapStatusLookupDecision {
  return {
    scope: 'agentic_wallet_market_swap_status_lookup_decision',
    status,
    blockers,
    command,
    statusLookupRequired,
    providerCallStarted: false,
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    submissionRetryAllowed: false,
  };
}
