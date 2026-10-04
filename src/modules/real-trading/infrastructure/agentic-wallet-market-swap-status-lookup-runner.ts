import type { AgenticWalletMarketSwapStatusLookupDecision } from './agentic-wallet-market-swap-status-lookup-decision';

export interface AgenticWalletMarketSwapStatusLookupCommand {
  readonly kind: 'market_order_status_lookup';
  readonly providerOrderId: string;
}

export interface AgenticWalletMarketSwapStatusLookupRunner {
  run(
    command: AgenticWalletMarketSwapStatusLookupCommand,
    signal?: AbortSignal,
  ): Promise<unknown>;
}

export function prepareAgenticWalletMarketSwapStatusLookupCommand(
  decision: AgenticWalletMarketSwapStatusLookupDecision,
): AgenticWalletMarketSwapStatusLookupCommand | null {
  if (
    decision.status !== 'status_command_preview_ready' ||
    decision.command === null
  ) {
    return null;
  }
  return {
    kind: 'market_order_status_lookup',
    providerOrderId: decision.command.providerOrderId,
  };
}
