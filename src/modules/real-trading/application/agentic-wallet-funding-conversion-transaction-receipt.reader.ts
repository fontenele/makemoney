export interface FundingConversionTransactionReceipt {
  readonly scope: 'agentic_wallet_funding_conversion_transaction_receipt';
  readonly transactionHash: string;
  readonly chainId: '56';
  readonly walletAddress: string;
  readonly sourceTokenAddress: string;
  readonly targetTokenAddress: string;
  readonly sourceQuantityBnb: string;
  readonly actualUsdtReceived: string;
  readonly networkFeeQuantityBnb: string;
  readonly transactionTime: Date;
  readonly observedAt: Date;
}

export abstract class AgenticWalletFundingConversionTransactionReceiptReader {
  abstract load(
    transactionHash: string,
    signal?: AbortSignal,
  ): Promise<FundingConversionTransactionReceipt>;
}
