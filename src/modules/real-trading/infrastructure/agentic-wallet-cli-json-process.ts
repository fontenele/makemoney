import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { delimiter, resolve } from 'node:path';

const MAX_OUTPUT_BYTES = 64 * 1024;

export interface AgenticWalletProcessInvocation {
  readonly executable: string;
  readonly leadingArguments: readonly string[];
}

export class AgenticWalletCliJsonProcess {
  constructor(
    private readonly operation: 'read' | 'quote' | 'status lookup',
    private readonly timeoutMs = 5000,
    private readonly executable?: string,
  ) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000) {
      throw new Error(
        'Agentic Wallet CLI timeout must be between 1000 and 30000 ms',
      );
    }
  }

  run(args: readonly string[], signal?: AbortSignal): Promise<unknown> {
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
          const value: unknown = JSON.parse(
            Buffer.concat(stdout).toString('utf8'),
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
