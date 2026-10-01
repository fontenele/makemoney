import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, resolve } from 'node:path';
import {
  AgenticWalletReadCommand,
  AgenticWalletReadCommandRunner,
} from './agentic-wallet-read-command-runner';

const REQUIRED_CLI_VERSION = '1.10.0';
const CHAIN_ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;
const MAX_OUTPUT_BYTES = 64 * 1024;

export interface AgenticWalletProcessInvocation {
  readonly executable: string;
  readonly leadingArguments: readonly string[];
}

export class AgenticWalletCliProcessRunner implements AgenticWalletReadCommandRunner {
  constructor(
    private readonly timeoutMs = 5000,
    private readonly executable?: string,
  ) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
      throw new Error(
        'Agentic Wallet CLI timeout must be between 1000 and 30000 ms',
      );
    }
  }

  run(
    command: AgenticWalletReadCommand,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const args = buildAgenticWalletReadArguments(command);
    let invocation: AgenticWalletProcessInvocation;
    try {
      invocation = this.executable
        ? { executable: this.executable, leadingArguments: [] }
        : buildAgenticWalletProcessInvocation(
            process.platform,
            process.env.PATH,
            process.execPath,
          );
    } catch {
      return Promise.reject(
        new Error('Agentic Wallet read command could not start'),
      );
    }

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(new Error('Agentic Wallet read command was cancelled'));
        return;
      }

      const child = spawn(
        invocation.executable,
        [...invocation.leadingArguments, ...args],
        {
          shell: false,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      const stdout: Buffer[] = [];
      let outputBytes = 0;
      let settled = false;

      const finish = (action: () => void): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        signal?.removeEventListener('abort', onAbort);
        action();
      };
      const fail = (reason: string): void => {
        child.kill();
        finish(() => reject(new Error(reason)));
      };
      const onAbort = (): void =>
        fail('Agentic Wallet read command was cancelled');
      const timer = setTimeout(
        () => fail('Agentic Wallet read command timed out'),
        this.timeoutMs,
      );

      signal?.addEventListener('abort', onAbort, { once: true });
      child.stdout.on('data', (chunk: Buffer) => {
        outputBytes += chunk.length;
        if (outputBytes > MAX_OUTPUT_BYTES) {
          fail('Agentic Wallet read command output exceeded its limit');
          return;
        }
        stdout.push(chunk);
      });
      child.stderr.resume();
      child.on('error', () =>
        finish(() =>
          reject(new Error('Agentic Wallet read command could not start')),
        ),
      );
      child.on('close', (code) => {
        if (settled) return;
        if (code !== 0) {
          finish(() => reject(new Error('Agentic Wallet read command failed')));
          return;
        }
        try {
          const value: unknown = JSON.parse(
            Buffer.concat(stdout).toString('utf8'),
          );
          finish(() => resolve(value));
        } catch {
          finish(() =>
            reject(
              new Error('Agentic Wallet read command returned invalid JSON'),
            ),
          );
        }
      });
    });
  }
}

export function buildAgenticWalletProcessInvocation(
  platform: NodeJS.Platform,
  pathValue: string | undefined,
  nodeExecutable: string,
  fileExists: (path: string) => boolean = existsSync,
): AgenticWalletProcessInvocation {
  if (platform !== 'win32') {
    return { executable: 'baw', leadingArguments: [] };
  }

  for (const pathEntry of (pathValue ?? '').split(delimiter)) {
    if (pathEntry.length === 0) continue;
    const cliEntry = resolve(
      pathEntry,
      'node_modules',
      '@binance',
      'agentic-wallet',
      'dist',
      'index.js',
    );
    if (fileExists(cliEntry)) {
      return { executable: nodeExecutable, leadingArguments: [cliEntry] };
    }
  }

  throw new Error('Agentic Wallet CLI entry point is unavailable');
}

export function buildAgenticWalletReadArguments(
  command: AgenticWalletReadCommand,
): readonly string[] {
  switch (command.kind) {
    case 'cli_version':
      return [
        'cli-check',
        '--required-version',
        REQUIRED_CLI_VERSION,
        '--json',
      ];
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
