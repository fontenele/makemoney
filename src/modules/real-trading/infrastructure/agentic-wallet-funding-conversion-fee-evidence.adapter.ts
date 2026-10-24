import Decimal from 'decimal.js';

import {
  AgenticWalletFundingConversionFeeEvidenceReader,
  FundingConversionFeeEvidence,
  FundingConversionFeeEvidenceRequest,
} from '../application/agentic-wallet-funding-conversion-fee-evidence.reader';
import { AgenticWalletCliJsonProcess } from './agentic-wallet-cli-json-process';
import { AgenticWalletCliTextProcess } from './agentic-wallet-cli-text-process';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';
import {
  buildAgenticWalletCliVersionCheckArguments,
  validateAgenticWalletCliVersion,
} from './agentic-wallet-cli-version';

const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;
const PERCENT_PATTERN = /^(?:0(?:\.\d+)?|[1-9]\d?(?:\.\d+)?|100(?:\.0+)?)$/;
const ExactDecimal = Decimal.clone({
  precision: 80,
  toExpNeg: -80,
  toExpPos: 80,
});

export class AgenticWalletFundingConversionFeeEvidenceAdapter extends AgenticWalletFundingConversionFeeEvidenceReader {
  constructor(
    private readonly textProcess = new AgenticWalletCliTextProcess('fee quote'),
    private readonly jsonProcess = new AgenticWalletCliJsonProcess('quote'),
    private readonly now: () => Date = () => new Date(),
  ) {
    super();
  }

  async load(
    request: FundingConversionFeeEvidenceRequest,
    signal?: AbortSignal,
  ): Promise<FundingConversionFeeEvidence> {
    const sourceQuantity = positive(
      request.sourceQuantityBnb,
      'source quantity',
    );
    const maximumSlippagePercent = percent(request.maximumSlippagePercent);
    validateAgenticWalletCliVersion(
      await this.jsonProcess.run(
        buildAgenticWalletCliVersionCheckArguments(),
        signal,
      ),
      'quote',
    );
    const output = await this.textProcess.run(
      [
        'market-order',
        'quote',
        '--fromTokenQty',
        sourceQuantity,
        '--fromToken',
        BSC_NATIVE_BNB_ADDRESS,
        '--toToken',
        BSC_USDT_ADDRESS,
        '--binanceChainId',
        '56',
        '--slippage',
        maximumSlippagePercent,
      ],
      signal,
    );
    const parsed = parseQuote(output);
    if (
      !new ExactDecimal(parsed.sourceQuantityBnb).equals(sourceQuantity) ||
      !new ExactDecimal(parsed.maximumSlippagePercent).equals(
        maximumSlippagePercent,
      )
    )
      throw new Error('Agentic Wallet fee quote context diverged');
    const observedAt = this.now();
    if (!Number.isFinite(observedAt.getTime()))
      throw new Error('Agentic Wallet fee quote observation time is invalid');
    return {
      scope: 'agentic_wallet_funding_conversion_fee_evidence',
      provider: 'agentic_wallet',
      chainId: '56',
      ...parsed,
      observedAt: new Date(observedAt),
    };
  }
}

function parseQuote(output: string) {
  const lines = output.trim().split(/\r?\n/);
  if (lines.length !== 8 || lines[0]?.trim() !== 'Swap Quote')
    throw new Error('Agentic Wallet fee quote response is invalid');
  const from = match(lines[1], /^From:\s+(\S+) BNB$/);
  const to = match(lines[2], /^To:\s+(\S+) USDT$/);
  const slippage = match(lines[3], /^Slippage:\s+(\S+)%$/);
  const fee = match(lines[4], /^Fee:\s+(\S+)%$/);
  const feeUsd = match(lines[5], /^Fee \(USD\):\s+\$(\S+)$/);
  const gasUsd = match(lines[6], /^Gas \(USD\):\s+\$(\S+)$/);
  const gasMode = match(lines[7], /^Gas Mode:\s+([A-Za-z]{1,16})$/);
  return {
    sourceQuantityBnb: positive(from, 'returned source quantity'),
    expectedUsdt: positive(to, 'expected USDT quantity'),
    maximumSlippagePercent: percent(slippage),
    providerFeeRate: new ExactDecimal(nonnegative(fee, 'provider fee percent'))
      .div(100)
      .toFixed(),
    providerFeeUsd: nonnegative(feeUsd, 'provider fee USD'),
    estimatedNetworkFeeUsd: nonnegative(gasUsd, 'network fee USD'),
    gasMode: gasMode.toLowerCase(),
  };
}

function match(value: string | undefined, pattern: RegExp): string {
  const matched = value?.match(pattern)?.[1];
  if (matched === undefined)
    throw new Error('Agentic Wallet fee quote response is invalid');
  return matched;
}

function positive(value: string, field: string): string {
  if (!POSITIVE_DECIMAL_PATTERN.test(value))
    throw new Error(`Agentic Wallet fee quote ${field} is invalid`);
  return new ExactDecimal(value).toFixed();
}

function nonnegative(value: string, field: string): string {
  if (!DECIMAL_PATTERN.test(value))
    throw new Error(`Agentic Wallet fee quote ${field} is invalid`);
  return new ExactDecimal(value).toFixed();
}

function percent(value: string): string {
  if (!PERCENT_PATTERN.test(value))
    throw new Error('Agentic Wallet fee quote slippage is invalid');
  return new ExactDecimal(value).toFixed();
}
