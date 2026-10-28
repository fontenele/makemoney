import type { FundingConversionAccountingAbsenceEvidence } from './agentic-wallet-funding-conversion-accounting-bootstrap';

export abstract class AgenticWalletFundingConversionAccountingAbsenceReader {
  abstract inspect(): Promise<FundingConversionAccountingAbsenceEvidence>;
}
