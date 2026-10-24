export interface FundingConversionFeeEvidenceRequest {
  readonly sourceQuantityBnb: string;
  readonly maximumSlippagePercent: string;
}

export interface FundingConversionFeeEvidence {
  readonly scope: 'agentic_wallet_funding_conversion_fee_evidence';
  readonly provider: 'agentic_wallet';
  readonly chainId: '56';
  readonly sourceQuantityBnb: string;
  readonly expectedUsdt: string;
  readonly maximumSlippagePercent: string;
  readonly providerFeeRate: string;
  readonly providerFeeUsd: string;
  readonly estimatedNetworkFeeUsd: string;
  readonly gasMode: string;
  readonly observedAt: Date;
}

export abstract class AgenticWalletFundingConversionFeeEvidenceReader {
  abstract load(
    request: FundingConversionFeeEvidenceRequest,
    signal?: AbortSignal,
  ): Promise<FundingConversionFeeEvidence>;
}
