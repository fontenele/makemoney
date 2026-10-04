import { AgenticWalletCliJsonProcess } from './agentic-wallet-cli-json-process';
import {
  buildAgenticWalletCliVersionCheckArguments,
  validateAgenticWalletCliVersion,
} from './agentic-wallet-cli-version';
import {
  AgenticWalletMarketSwapStatusLookupCommand,
  AgenticWalletMarketSwapStatusLookupRunner,
} from './agentic-wallet-market-swap-status-lookup-runner';
import { isSafeAgenticWalletProviderOrderId } from './agentic-wallet-market-swap-submission-response';

export class AgenticWalletMarketSwapStatusLookupCliProcessRunner implements AgenticWalletMarketSwapStatusLookupRunner {
  private readonly process: AgenticWalletCliJsonProcess;

  constructor(timeoutMs = 5000, executable?: string) {
    this.process = new AgenticWalletCliJsonProcess(
      'status lookup',
      timeoutMs,
      executable,
    );
  }

  async run(
    command: AgenticWalletMarketSwapStatusLookupCommand,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const args = buildAgenticWalletMarketSwapStatusLookupArguments(command);
    validateAgenticWalletCliVersion(
      await this.process.run(
        buildAgenticWalletCliVersionCheckArguments(),
        signal,
      ),
      'status lookup',
    );
    return this.process.run(args, signal);
  }
}

export function buildAgenticWalletMarketSwapStatusLookupArguments(
  command: AgenticWalletMarketSwapStatusLookupCommand,
): readonly string[] {
  if (command.kind !== 'market_order_status_lookup') {
    throw new Error('Agentic Wallet status lookup command is unsupported');
  }
  if (!isSafeAgenticWalletProviderOrderId(command.providerOrderId)) {
    throw new Error('Agentic Wallet status lookup order identity is unsafe');
  }
  return [
    'market-order',
    'list',
    '--orderId',
    command.providerOrderId,
    '--json',
  ];
}
