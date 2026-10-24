export interface FundingConversionPreBalanceSnapshot {
  readonly scope: 'agentic_wallet_funding_conversion_pre_balance_snapshot';
  readonly chainId: '56';
  readonly walletAddress: string;
  readonly blockNumber: string;
  readonly bnbBalance: string;
  readonly usdtBalance: string;
  readonly observedAt: Date;
}

export abstract class AgenticWalletFundingConversionPreBalanceReader {
  abstract load(
    walletAddress: string,
    signal?: AbortSignal,
  ): Promise<FundingConversionPreBalanceSnapshot>;
}
