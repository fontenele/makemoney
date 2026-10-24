export interface FundingConversionPostBalanceSnapshot {
  readonly scope: 'agentic_wallet_funding_conversion_post_balance_snapshot';
  readonly chainId: '56';
  readonly walletAddress: string;
  readonly blockNumber: string;
  readonly bnbBalance: string;
  readonly usdtBalance: string;
  readonly observedAt: Date;
}

export abstract class AgenticWalletFundingConversionPostBalanceReader {
  abstract load(
    walletAddress: string,
    signal?: AbortSignal,
  ): Promise<FundingConversionPostBalanceSnapshot>;
}
