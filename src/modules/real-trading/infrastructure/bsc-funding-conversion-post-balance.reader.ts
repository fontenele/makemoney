import { AgenticWalletFundingConversionPreBalanceReader } from '../application/agentic-wallet-funding-conversion-pre-balance.reader';
import {
  AgenticWalletFundingConversionPostBalanceReader,
  FundingConversionPostBalanceSnapshot,
} from '../application/agentic-wallet-funding-conversion-post-balance.reader';
import { BscFundingConversionPreBalanceReader } from './bsc-funding-conversion-pre-balance.reader';

export class BscFundingConversionPostBalanceReader extends AgenticWalletFundingConversionPostBalanceReader {
  constructor(
    private readonly balanceReader: AgenticWalletFundingConversionPreBalanceReader = new BscFundingConversionPreBalanceReader(),
  ) {
    super();
  }

  async load(
    walletAddress: string,
    signal?: AbortSignal,
  ): Promise<FundingConversionPostBalanceSnapshot> {
    const snapshot = await this.balanceReader.load(walletAddress, signal);
    return {
      ...snapshot,
      scope: 'agentic_wallet_funding_conversion_post_balance_snapshot',
    };
  }
}
