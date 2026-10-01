export type AgenticWalletReadCommand =
  | { readonly kind: 'cli_version' }
  | { readonly kind: 'wallet_status' }
  | { readonly kind: 'wallet_chains' }
  | { readonly kind: 'wallet_settings' }
  | { readonly kind: 'wallet_address' }
  | { readonly kind: 'wallet_balance'; readonly chainId: string }
  | { readonly kind: 'wallet_gas_price'; readonly chainId: string };

export interface AgenticWalletReadCommandRunner {
  run(
    command: AgenticWalletReadCommand,
    signal?: AbortSignal,
  ): Promise<unknown>;
}
