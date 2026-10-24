export type FundingConversionFinancialEvidenceCapabilityBlocker =
  'terminal_funding_conversion_context_unavailable';

export type FundingConversionFinancialEvidenceReadResult =
  | {
      readonly status: 'evidence_available';
      readonly evidence: unknown;
    }
  | {
      readonly status: 'evidence_unavailable';
      readonly blockers: readonly FundingConversionFinancialEvidenceCapabilityBlocker[];
    };

export abstract class AgenticWalletFundingConversionFinancialEvidenceReader {
  abstract load(
    attemptId: string,
    signal?: AbortSignal,
  ): Promise<FundingConversionFinancialEvidenceReadResult>;
}
