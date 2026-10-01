export interface AgenticWalletMarketQuoteCommand {
  readonly kind: 'market_order_quote';
  readonly chainId: string;
  readonly sourceTokenAddress: string;
  readonly targetTokenAddress: string;
  readonly sourceQuantity: string;
  readonly maximumSlippagePercent: string;
}

export interface AgenticWalletQuoteCommandRunner {
  run(
    command: AgenticWalletMarketQuoteCommand,
    signal?: AbortSignal,
  ): Promise<unknown>;
}
