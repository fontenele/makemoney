import {
  AgenticWalletMarketQuoteCommand,
  AgenticWalletQuoteCommandRunner,
} from './agentic-wallet-quote-command-runner';
import { AgenticWalletCliJsonProcess } from './agentic-wallet-cli-json-process';

const CHAIN_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const REQUIRED_CLI_VERSION = '1.10.0';
const EVM_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;
const PERCENT_PATTERN = /^(?:0(?:\.\d+)?|[1-9]\d?(?:\.\d+)?|100(?:\.0+)?)$/;

export class AgenticWalletQuoteCliProcessRunner implements AgenticWalletQuoteCommandRunner {
  private readonly process: AgenticWalletCliJsonProcess;

  constructor(timeoutMs = 5000, executable?: string) {
    this.process = new AgenticWalletCliJsonProcess(
      'quote',
      timeoutMs,
      executable,
    );
  }

  async run(
    command: AgenticWalletMarketQuoteCommand,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const args = buildAgenticWalletQuoteArguments(command);
    validateAgenticWalletQuoteCliVersion(
      await this.process.run(
        ['cli-check', '--required-version', REQUIRED_CLI_VERSION, '--json'],
        signal,
      ),
    );
    return this.process.run(args, signal);
  }
}

export function validateAgenticWalletQuoteCliVersion(value: unknown): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Agentic Wallet quote CLI version response is invalid');
  }
  const envelope = value as Record<string, unknown>;
  if (
    envelope.success !== true ||
    typeof envelope.data !== 'object' ||
    envelope.data === null ||
    Array.isArray(envelope.data)
  ) {
    throw new Error('Agentic Wallet quote CLI version response is invalid');
  }
  const data = envelope.data as Record<string, unknown>;
  if (
    data.currentCliVersion !== REQUIRED_CLI_VERSION ||
    data.needUpdateCli !== false
  ) {
    throw new Error(
      'Agentic Wallet quote CLI version does not match the pinned version',
    );
  }
}

export function buildAgenticWalletQuoteArguments(
  command: AgenticWalletMarketQuoteCommand,
): readonly string[] {
  if (command.kind !== 'market_order_quote') {
    throw new Error('Agentic Wallet quote command is unsupported');
  }
  if (!CHAIN_ID_PATTERN.test(command.chainId)) {
    throw new Error('Agentic Wallet quote chain id must be canonical');
  }
  if (
    !EVM_ADDRESS_PATTERN.test(command.sourceTokenAddress) ||
    !EVM_ADDRESS_PATTERN.test(command.targetTokenAddress) ||
    command.sourceTokenAddress.toLowerCase() ===
      command.targetTokenAddress.toLowerCase()
  ) {
    throw new Error(
      'Agentic Wallet quote token addresses must be distinct EVM addresses',
    );
  }
  if (!POSITIVE_DECIMAL_PATTERN.test(command.sourceQuantity)) {
    throw new Error('Agentic Wallet quote source quantity must be positive');
  }
  if (!PERCENT_PATTERN.test(command.maximumSlippagePercent)) {
    throw new Error(
      'Agentic Wallet quote slippage percent must be between zero and 100',
    );
  }

  return [
    'market-order',
    'quote',
    '--fromTokenQty',
    command.sourceQuantity,
    '--fromToken',
    command.sourceTokenAddress,
    '--toToken',
    command.targetTokenAddress,
    '--binanceChainId',
    command.chainId,
    '--slippage',
    command.maximumSlippagePercent,
    '--json',
  ];
}
