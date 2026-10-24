import { spawn } from 'node:child_process';

import { buildAgenticWalletProcessInvocation } from './agentic-wallet-cli-json-process';

const MAX_OUTPUT_BYTES = 64 * 1024;

export class AgenticWalletCliTextProcess {
  constructor(
    private readonly operation: 'fee quote',
    private readonly timeoutMs = 5000,
    private readonly executable?: string,
  ) {
    if (!Number.isInteger(timeoutMs) || timeoutMs < 1000 || timeoutMs > 30000)
      throw new Error(
        'Agentic Wallet CLI timeout must be between 1000 and 30000 ms',
      );
  }

  run(args: readonly string[], signal?: AbortSignal): Promise<string> {
    let invocation;
    try {
      invocation = this.executable
        ? { executable: this.executable, leadingArguments: [] as string[] }
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
        { shell: false, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] },
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
        if (outputBytes > MAX_OUTPUT_BYTES)
          return fail('output exceeded its limit');
        stdout.push(chunk);
      });
      child.stderr.resume();
      child.on('error', () =>
        finish(() => reject(this.error('could not start'))),
      );
      child.on('close', (code) => {
        if (settled) return;
        if (code !== 0) return finish(() => reject(this.error('failed')));
        const output = Buffer.concat(stdout).toString('utf8');
        if (Buffer.byteLength(output) === 0)
          return finish(() => reject(this.error('returned empty output')));
        finish(() => resolve(output));
      });
    });
  }

  private error(reason: string): Error {
    return new Error(`Agentic Wallet ${this.operation} command ${reason}`);
  }
}
