export interface FundingConversionAccountingSnapshotBalance {
  readonly assetIdentity: string;
  readonly assetType: 'native' | 'token';
  readonly assetAddress: string | null;
  readonly assetSymbol: string | null;
  readonly quantity: string;
}

export interface FundingConversionAccountingSnapshot {
  readonly scope: 'agentic_wallet_funding_conversion_accounting_snapshot';
  readonly chainId: '56';
  readonly walletAddress: string;
  readonly blockNumber: string;
  readonly balances: readonly FundingConversionAccountingSnapshotBalance[];
  readonly observedAt: Date;
}

export abstract class AgenticWalletFundingConversionAccountingSnapshotReader {
  abstract load(
    walletAddress: string,
    signal?: AbortSignal,
  ): Promise<FundingConversionAccountingSnapshot>;
}
