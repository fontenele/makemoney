import { AgenticWalletCapabilityAdapter } from './agentic-wallet-capability.adapter';
import {
  AgenticWalletReadCommand,
  AgenticWalletReadCommandRunner,
} from './agentic-wallet-read-command-runner';

describe('AgenticWalletCapabilityAdapter', () => {
  it('loads and validates the complete read-only capability observation', async () => {
    const runner = new StubRunner(connectedResponses());
    const adapter = new AgenticWalletCapabilityAdapter(runner);

    await expect(
      adapter.load('56', new Date('2026-09-30T12:00:00.000Z')),
    ).resolves.toEqual({
      cliVersion: '1.10.0',
      requiredCliVersion: '1.10.0',
      capabilities: {
        providerId: 'agentic_wallet',
        connected: true,
        chains: [
          { chainId: '56', operations: [] },
          { chainId: 'CT_501', operations: [] },
        ],
        reads: {
          securitySettings: true,
          quota: true,
          balances: true,
          gas: true,
        },
        observedAt: new Date('2026-09-30T12:00:00.000Z'),
      },
      settings: {
        dailyLimitUsd: '50000',
        abnormalTransactionHandling: 'AutoReject',
        tradeAllTokens: false,
        predictionTradingEnabled: false,
        developerModeEnabled: false,
        sessionExpiresAt: new Date('2026-10-01T12:00:00.000Z'),
      },
      quota: {
        usedUsd: '0',
        remainingUsd: '50000',
        date: '2026-09-30',
      },
      addresses: [
        { chainId: '56', address: '0xwallet' },
        { chainId: 'CT_501', address: 'solana-wallet' },
      ],
      balances: [
        {
          chainId: '56',
          tokenAddress: '0xusdt',
          symbol: 'USDT',
          quantity: '1000.50',
        },
      ],
      gas: {
        chainId: '56',
        baseFeePerGas: '0',
        low: gasLevel('0.053', '16000'),
        medium: gasLevel('0.054', '8000'),
        high: gasLevel('0.055', '3000'),
      },
    });
    expect(runner.commands).toEqual([
      { kind: 'cli_version' },
      { kind: 'wallet_status' },
      { kind: 'wallet_chains' },
      { kind: 'wallet_settings' },
      { kind: 'wallet_address' },
      { kind: 'wallet_balance', chainId: '56' },
      { kind: 'wallet_gas_price', chainId: '56' },
    ]);
  });

  it.each(['UNCONNECTED', 'CREATING'] as const)(
    'stops after status %s and returns an explicitly unavailable observation',
    async (status) => {
      const runner = new StubRunner({
        cli_version: cliVersion(),
        wallet_status: envelope({ status }),
      });

      await expect(
        new AgenticWalletCapabilityAdapter(runner).load(
          '56',
          new Date('2026-09-30T12:00:00.000Z'),
        ),
      ).resolves.toMatchObject({
        capabilities: {
          connected: false,
          chains: [],
          reads: {
            securitySettings: false,
            quota: false,
            balances: false,
            gas: false,
          },
        },
        settings: null,
        quota: null,
        addresses: [],
        balances: [],
        gas: null,
      });
      expect(runner.commands).toHaveLength(2);
    },
  );

  it('passes the same cancellation signal to every read', async () => {
    const runner = new StubRunner(connectedResponses());
    const signal = new AbortController().signal;

    await new AgenticWalletCapabilityAdapter(runner).load(
      '56',
      new Date('2026-09-30T12:00:00.000Z'),
      signal,
    );

    expect(runner.signals).toHaveLength(7);
    expect(runner.signals.every((received) => received === signal)).toBe(true);
  });

  it('rejects an unpinned CLI version before reading wallet state', async () => {
    const runner = new StubRunner({
      cli_version: envelope({
        currentCliVersion: '1.11.0',
        needUpdateCli: false,
      }),
    });

    await expect(
      new AgenticWalletCapabilityAdapter(runner).load(
        '56',
        new Date('2026-09-30T12:00:00.000Z'),
      ),
    ).rejects.toThrow(
      'Agentic Wallet CLI version does not match the pinned version',
    );
    expect(runner.commands).toEqual([{ kind: 'cli_version' }]);
  });

  it('rejects an unavailable approved chain before settings or balance reads', async () => {
    const responses = connectedResponses();
    responses.wallet_chains = envelope([{ binanceChainId: 'CT_501' }]);
    const runner = new StubRunner(responses);

    await expect(
      new AgenticWalletCapabilityAdapter(runner).load(
        '56',
        new Date('2026-09-30T12:00:00.000Z'),
      ),
    ).rejects.toThrow('Agentic Wallet approved chain is unavailable');
    expect(runner.commands).toHaveLength(3);
  });

  it('rejects missing approved-chain address before financial reads', async () => {
    const responses = connectedResponses();
    responses.wallet_address = envelope({
      addresses: [{ binanceChainId: 'CT_501', address: 'solana-wallet' }],
    });
    const runner = new StubRunner(responses);

    await expect(
      new AgenticWalletCapabilityAdapter(runner).load(
        '56',
        new Date('2026-09-30T12:00:00.000Z'),
      ),
    ).rejects.toThrow('Agentic Wallet approved chain address is unavailable');
    expect(runner.commands).toHaveLength(5);
  });

  it.each([
    [
      'duplicate chains',
      'wallet_chains',
      envelope([{ binanceChainId: '56' }, { binanceChainId: '56' }]),
      'Agentic Wallet chains must be unique',
    ],
    [
      'unsafe security setting',
      'wallet_settings',
      envelope({
        ...settingsData(),
        abnormalTxnHandling: 'Allow',
      }),
      'Agentic Wallet abnormal transaction handling is invalid',
    ],
    [
      'cross-chain balance',
      'wallet_balance:56',
      envelope([
        {
          binanceChainId: '1',
          address: '0xusdt',
          symbol: 'USDT',
          balance: '1',
        },
      ]),
      'Agentic Wallet balance chain does not match the request',
    ],
    [
      'floating-point balance',
      'wallet_balance:56',
      envelope([
        {
          binanceChainId: '56',
          address: '0xusdt',
          symbol: 'USDT',
          balance: 0.1,
        },
      ]),
      'Agentic Wallet balance is invalid',
    ],
    [
      'negative gas price',
      'wallet_gas_price:56',
      envelope(invalidNegativeGasData()),
      'Agentic Wallet gas price is invalid',
    ],
  ])(
    'rejects malformed provider data: %s',
    async (_name, key, value, error) => {
      const responses = connectedResponses();
      responses[key] = value;

      await expect(
        new AgenticWalletCapabilityAdapter(new StubRunner(responses)).load(
          '56',
          new Date('2026-09-30T12:00:00.000Z'),
        ),
      ).rejects.toThrow(error);
    },
  );
});

class StubRunner implements AgenticWalletReadCommandRunner {
  readonly commands: AgenticWalletReadCommand[] = [];
  readonly signals: (AbortSignal | undefined)[] = [];

  constructor(readonly responses: Record<string, unknown>) {}

  async run(
    command: AgenticWalletReadCommand,
    signal?: AbortSignal,
  ): Promise<unknown> {
    this.commands.push(command);
    this.signals.push(signal);
    const key = commandKey(command);
    if (!(key in this.responses)) {
      throw new Error(`Unexpected command: ${key}`);
    }
    return Promise.resolve(this.responses[key]);
  }
}

function commandKey(command: AgenticWalletReadCommand): string {
  return 'chainId' in command
    ? `${command.kind}:${command.chainId}`
    : command.kind;
}

function connectedResponses(): Record<string, unknown> {
  return {
    cli_version: cliVersion(),
    wallet_status: envelope({ status: 'CONNECTED' }),
    wallet_chains: envelope([
      { binanceChainId: '56' },
      { binanceChainId: 'CT_501' },
    ]),
    wallet_settings: envelope(settingsData()),
    wallet_address: envelope({
      addresses: [
        { binanceChainId: '56', address: '0xwallet' },
        { binanceChainId: 'CT_501', address: 'solana-wallet' },
      ],
    }),
    'wallet_balance:56': envelope([
      {
        binanceChainId: '56',
        address: '0xusdt',
        symbol: 'USDT',
        balance: '1000.50',
      },
    ]),
    'wallet_gas_price:56': envelope(gasData()),
  };
}

function cliVersion(): unknown {
  return envelope({ currentCliVersion: '1.10.0', needUpdateCli: false });
}

function settingsData(): Record<string, unknown> {
  return {
    dailyLimit: 50000,
    abnormalTxnHandling: 'AutoReject',
    tradeAllTokens: false,
    predictionEnabled: false,
    devMode: { enabled: false },
    quotaUsed: 0,
    quotaLeft: 50000,
    quotaDate: '2026-09-30',
    sessionExpireTime: '2026-10-01T12:00:00.000Z',
  };
}

function gasData(): Record<string, unknown> {
  return {
    baseFeePerGas: '0',
    low: gasLevelData('0.053', 16000),
    medium: gasLevelData('0.054', 8000),
    high: gasLevelData('0.055', 3000),
  };
}

function invalidNegativeGasData(): Record<string, unknown> {
  return {
    ...gasData(),
    low: gasLevelData('-1', 16000),
  };
}

function gasLevelData(gasPrice: string, waitTimeEstimate: number) {
  return {
    gasPrice,
    maxFeePerGas: gasPrice,
    maxPriorityFeePerGas: gasPrice,
    tipAmount: null,
    waitTimeEstimate,
  };
}

function gasLevel(gasPrice: string, waitTimeEstimate: string) {
  return {
    gasPrice,
    maxFeePerGas: gasPrice,
    maxPriorityFeePerGas: gasPrice,
    tipAmount: null,
    waitTimeEstimateMs: Number(waitTimeEstimate),
  };
}

function envelope(data: unknown): unknown {
  return { success: true, data };
}
