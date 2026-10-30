import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, resolve } from 'node:path';
import Decimal from 'decimal.js';

const MAX_OUTPUT_BYTES = 64 * 1024;
const QuotaDecimal = Decimal.clone({
  precision: 80,
  toExpNeg: -80,
  toExpPos: 80,
});

/** Preserve the reported JSON decimal token before conversion through binary floats. */
export function parseAgenticWalletCliJsonOutput(
  text: string,
  quotaRead = false,
): unknown {
  if (!quotaRead) {
    const parsed: unknown = JSON.parse(text);
    return parsed;
  }
  const parsed: unknown = JSON.parse(
    text,
    (key: string, value: unknown, context?: { source?: string }): unknown => {
      if (
        !['quotaUsed', 'quotaLeft', 'dailyLimit'].includes(key) ||
        typeof value !== 'number'
      )
        return value;
      const source = context?.source;
      if (
        typeof source !== 'string' ||
        source.length > 96 ||
        !/^(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(source)
      )
        throw new Error('Quota decimal source is unavailable or invalid');
      const amount = new QuotaDecimal(source);
      if (
        !amount.isFinite() ||
        amount.isNegative() ||
        amount.e > 19 ||
        amount.decimalPlaces() > 30
      )
        throw new Error('Quota decimal exceeds supported precision');
      return amount.toFixed();
    },
  );
  return parsed;
}

export interface AgenticWalletProcessInvocation {
  readonly executable: string;
  readonly leadingArguments: readonly string[];
}

export class AgenticWalletCliJsonProcess {
  constructor(
    private readonly operation:
      | 'read'
      | 'quote'
      | 'status lookup'
      | 'authentication'
      | 'real execution swap'
      | 'funding conversion swap'
      | 'funding conversion receipt',
    private readonly timeoutMs = 5000,
    private readonly executable?: string,
    maximumTimeoutMs = 30000,
  ) {
    if (
      !Number.isInteger(timeoutMs) ||
      timeoutMs < 1000 ||
      timeoutMs > maximumTimeoutMs
    ) {
      throw new Error(
        `Agentic Wallet CLI timeout must be between 1000 and ${maximumTimeoutMs} ms`,
      );
    }
  }

  run(args: readonly string[], signal?: AbortSignal): Promise<unknown> {
    const quotaRead =
      args[0] === 'wallet' &&
      (args[1] === 'left-quota' || args[1] === 'settings');
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
      return Promise.reject(this.error('could not start'));
    }

    return new Promise((resolve, reject) => {
      if (signal?.aborted) {
        reject(this.error('was cancelled'));
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
        finish(() => reject(this.error(reason)));
      };
      const onAbort = (): void => fail('was cancelled');
      const timer = setTimeout(() => fail('timed out'), this.timeoutMs);

      signal?.addEventListener('abort', onAbort, { once: true });
      child.stdout.on('data', (chunk: Buffer) => {
        outputBytes += chunk.length;
        if (outputBytes > MAX_OUTPUT_BYTES) {
          fail('output exceeded its limit');
          return;
        }
        stdout.push(chunk);
      });
      child.stderr.resume();
      child.on('error', () =>
        finish(() => reject(this.error('could not start'))),
      );
      child.on('close', (code) => {
        if (settled) return;
        if (code !== 0) {
          finish(() => reject(this.error('failed')));
          return;
        }
        try {
          const value: unknown = parseAgenticWalletCliJsonOutput(
            Buffer.concat(stdout).toString('utf8'),
            quotaRead,
          );
          finish(() => resolve(value));
        } catch {
          finish(() => reject(this.error('returned invalid JSON')));
        }
      });
    });
  }

  private error(reason: string): Error {
    return new Error(`Agentic Wallet ${this.operation} command ${reason}`);
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
