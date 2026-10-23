export abstract class AgenticWalletFundingConversionFinancialEvidenceReader {
  abstract load(attemptId: string, signal?: AbortSignal): Promise<unknown>;
}
