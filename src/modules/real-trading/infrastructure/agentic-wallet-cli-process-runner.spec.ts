import {
  AgenticWalletCliProcessRunner,
  buildAgenticWalletReadArguments,
  buildAgenticWalletProcessInvocation,
} from './agentic-wallet-cli-process-runner';

describe('AgenticWalletCliProcessRunner', () => {
  it('accepts only bounded process timeouts', () => {
    expect(() => new AgenticWalletCliProcessRunner(999)).toThrow(
      'Agentic Wallet CLI timeout must be between 1000 and 30000 ms',
    );
    expect(() => new AgenticWalletCliProcessRunner(30001)).toThrow(
      'Agentic Wallet CLI timeout must be between 1000 and 30000 ms',
    );
    expect(() => new AgenticWalletCliProcessRunner(1000)).not.toThrow();
    expect(() => new AgenticWalletCliProcessRunner(30000)).not.toThrow();
  });
});

describe('buildAgenticWalletProcessInvocation', () => {
  it('invokes the package JavaScript entry with Node on Windows without a command shell', () => {
    const existingPaths: string[] = [];
    const invocation = buildAgenticWalletProcessInvocation(
      'win32',
      ['C:\\npm', 'D:\\tools'].join(';'),
      'C:\\node\\node.exe',
      (candidate) => {
        existingPaths.push(candidate);
        return candidate.startsWith('D:\\tools');
      },
    );

    expect(existingPaths).toHaveLength(2);
    expect(invocation).toEqual({
      executable: 'C:\\node\\node.exe',
      leadingArguments: [
        'D:\\tools\\node_modules\\@binance\\agentic-wallet\\dist\\index.js',
      ],
    });
  });

  it('uses the direct executable on non-Windows platforms', () => {
    expect(
      buildAgenticWalletProcessInvocation('linux', undefined, '/usr/bin/node'),
    ).toEqual({ executable: 'baw', leadingArguments: [] });
  });

  it('fails closed when the Windows package entry cannot be found', () => {
    expect(() =>
      buildAgenticWalletProcessInvocation(
        'win32',
        'C:\\npm',
        'C:\\node\\node.exe',
        () => false,
      ),
    ).toThrow('Agentic Wallet CLI entry point is unavailable');
  });
});

describe('buildAgenticWalletReadArguments', () => {
  it.each([
    [
      { kind: 'cli_version' } as const,
      ['cli-check', '--required-version', '1.10.0', '--json'],
    ],
    [{ kind: 'wallet_status' } as const, ['wallet', 'status', '--json']],
    [{ kind: 'wallet_chains' } as const, ['wallet', 'chains', '--json']],
    [{ kind: 'wallet_settings' } as const, ['wallet', 'settings', '--json']],
    [{ kind: 'wallet_address' } as const, ['wallet', 'address', '--json']],
    [
      { kind: 'wallet_balance', chainId: '56' } as const,
      ['wallet', 'balance', '--binanceChainId', '56', '--json'],
    ],
    [
      { kind: 'wallet_gas_price', chainId: 'CT_501' } as const,
      ['wallet', 'gas-price', '--binanceChainId', 'CT_501', '--json'],
    ],
  ])(
    'maps the allowlisted read command %# to an argument array',
    (command, expected) => {
      expect(buildAgenticWalletReadArguments(command)).toEqual(expected);
    },
  );

  it.each(['', '56;swap', '56 1', '../56', 'a'.repeat(33)])(
    'rejects a non-canonical chain id %p before process invocation',
    (chainId) => {
      expect(() =>
        buildAgenticWalletReadArguments({ kind: 'wallet_balance', chainId }),
      ).toThrow('Agentic Wallet chain id must be canonical');
    },
  );
});
