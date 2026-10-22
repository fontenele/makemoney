import { AgenticWalletCliJsonProcess } from './agentic-wallet-cli-json-process';
import {
  buildAgenticWalletCliVersionCheckArguments,
  validateAgenticWalletCliVersion,
} from './agentic-wallet-cli-version';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';

const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;
const PERCENT_PATTERN = /^(?:0(?:\.\d+)?|[1-9]\d?(?:\.\d+)?|100(?:\.0+)?)$/;

export interface AgenticWalletFundingConversionSwapCommand {
  readonly kind: 'funding_conversion_market_order_swap';
  readonly chainId: '56';
  readonly sourceTokenAddress: typeof BSC_NATIVE_BNB_ADDRESS;
  readonly targetTokenAddress: typeof BSC_USDT_ADDRESS;
  readonly sourceQuantityBnb: string;
  readonly maximumSlippagePercent: string;
  readonly mevProtection: true;
  readonly gasLevel: 'MEDIUM';
}

export interface AgenticWalletFundingConversionSwapCommandRunner {
  run(
    command: AgenticWalletFundingConversionSwapCommand,
    signal?: AbortSignal,
  ): Promise<unknown>;
}

export class AgenticWalletFundingConversionSwapCliProcessRunner implements AgenticWalletFundingConversionSwapCommandRunner {
  private readonly process: AgenticWalletCliJsonProcess;

  constructor(timeoutMs = 30000, executable?: string) {
    this.process = new AgenticWalletCliJsonProcess(
      'funding conversion swap',
      timeoutMs,
      executable,
    );
  }

  async run(
    command: AgenticWalletFundingConversionSwapCommand,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const arguments_ =
      buildAgenticWalletFundingConversionSwapArguments(command);
    validateAgenticWalletFundingConversionSwapCliVersion(
      await this.process.run(
        buildAgenticWalletCliVersionCheckArguments(),
        signal,
      ),
    );
    return this.process.run(arguments_, signal);
  }
}

export function validateAgenticWalletFundingConversionSwapCliVersion(
  value: unknown,
): void {
  validateAgenticWalletCliVersion(value, 'funding conversion swap');
}

export function buildAgenticWalletFundingConversionSwapArguments(
  command: AgenticWalletFundingConversionSwapCommand,
): readonly string[] {
  if (
    command.kind !== 'funding_conversion_market_order_swap' ||
    command.chainId !== '56' ||
    command.sourceTokenAddress !== BSC_NATIVE_BNB_ADDRESS ||
    command.targetTokenAddress !== BSC_USDT_ADDRESS ||
    command.mevProtection !== true ||
    command.gasLevel !== 'MEDIUM'
  ) {
    throw new Error(
      'Agentic Wallet funding conversion swap command is outside the approved envelope',
    );
  }
  if (!POSITIVE_DECIMAL_PATTERN.test(command.sourceQuantityBnb)) {
    throw new Error(
      'Agentic Wallet funding conversion swap quantity must be positive',
    );
  }
  if (!PERCENT_PATTERN.test(command.maximumSlippagePercent)) {
    throw new Error(
      'Agentic Wallet funding conversion swap slippage must be between zero and 100',
    );
  }

  return [
    'market-order',
    'swap',
    '--fromTokenQty',
    command.sourceQuantityBnb,
    '--fromToken',
    BSC_NATIVE_BNB_ADDRESS,
    '--toToken',
    BSC_USDT_ADDRESS,
    '--binanceChainId',
    '56',
    '--slippage',
    command.maximumSlippagePercent,
    '--mev',
    'true',
    '--gasLevel',
    'MEDIUM',
    '--json',
  ];
}
