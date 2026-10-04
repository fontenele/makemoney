import {
  AgenticWalletReadCommand,
  AgenticWalletReadCommandRunner,
} from './agentic-wallet-read-command-runner';
import { AgenticWalletCliJsonProcess } from './agentic-wallet-cli-json-process';
import { buildAgenticWalletCliVersionCheckArguments } from './agentic-wallet-cli-version';

export { buildAgenticWalletProcessInvocation } from './agentic-wallet-cli-json-process';

const CHAIN_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

export class AgenticWalletCliProcessRunner implements AgenticWalletReadCommandRunner {
  private readonly process: AgenticWalletCliJsonProcess;

  constructor(timeoutMs = 5000, executable?: string) {
    this.process = new AgenticWalletCliJsonProcess(
      'read',
      timeoutMs,
      executable,
    );
  }

  run(
    command: AgenticWalletReadCommand,
    signal?: AbortSignal,
  ): Promise<unknown> {
    return this.process.run(buildAgenticWalletReadArguments(command), signal);
  }
}

export function buildAgenticWalletReadArguments(
  command: AgenticWalletReadCommand,
): readonly string[] {
  switch (command.kind) {
    case 'cli_version':
      return buildAgenticWalletCliVersionCheckArguments();
    case 'wallet_status':
      return ['wallet', 'status', '--json'];
    case 'wallet_chains':
      return ['wallet', 'chains', '--json'];
    case 'wallet_settings':
      return ['wallet', 'settings', '--json'];
    case 'wallet_address':
      return ['wallet', 'address', '--json'];
    case 'wallet_balance':
      validateChainId(command.chainId);
      return [
        'wallet',
        'balance',
        '--binanceChainId',
        command.chainId,
        '--json',
      ];
    case 'wallet_gas_price':
      validateChainId(command.chainId);
      return [
        'wallet',
        'gas-price',
        '--binanceChainId',
        command.chainId,
        '--json',
      ];
  }
}

function validateChainId(chainId: string): void {
  if (!CHAIN_ID_PATTERN.test(chainId)) {
    throw new Error('Agentic Wallet chain id must be canonical');
  }
}
