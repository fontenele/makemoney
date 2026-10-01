import { AgenticWalletMarketQuoteAdapter } from './agentic-wallet-market-quote.adapter';
import {
  AgenticWalletMarketQuoteCommand,
  AgenticWalletQuoteCommandRunner,
} from './agentic-wallet-quote-command-runner';
import { RealExecutionIntent } from '../domain/real-execution';

const QUOTED_AT = new Date('2026-10-01T14:00:00.000Z');
const QUOTE_ID = '22222222-2222-4222-8222-222222222222';

describe('AgenticWalletMarketQuoteAdapter', () => {
  it('normalizes an approved buy as a short-lived non-executable partial-cost quote', async () => {
    const runner = new StubRunner(response());
    const adapter = new AgenticWalletMarketQuoteAdapter(
      runner,
      5000,
      () => QUOTE_ID,
      () => QUOTED_AT,
    );

    await expect(adapter.load(intent())).resolves.toEqual({
      id: QUOTE_ID,
      providerId: 'agentic_wallet',
      providerQuoteId: null,
      intent: intent(),
      expectedTargetQuantity: '0.000062',
      minimumTargetQuantity: '0.00006169',
      costs: [],
      costCoverage: 'partial',
      quotedAt: QUOTED_AT,
      expiresAt: new Date('2026-10-01T14:00:05.000Z'),
      executable: false,
    });
    expect(runner.commands).toEqual([
      {
        kind: 'market_order_quote',
        chainId: '56',
        sourceTokenAddress: '0x55d398326f99059ff775485246999027b3197955',
        targetTokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
        sourceQuantity: '5',
        maximumSlippagePercent: '0.5',
      },
    ]);
  });

  it('passes cancellation through without changing the command', async () => {
    const runner = new StubRunner(response());
    const signal = new AbortController().signal;
    await new AgenticWalletMarketQuoteAdapter(
      runner,
      5000,
      () => QUOTE_ID,
      () => QUOTED_AT,
    ).load(intent(), signal);
    expect(runner.signals).toEqual([signal]);
  });

  it('accepts the exact approved BTCB-to-USDT sell direction', async () => {
    const sellIntent = intent({
      sourceAsset: {
        tokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
        symbol: 'BTCB',
      },
      targetAsset: {
        tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
        symbol: 'USDT',
      },
      sourceQuantity: '0.0001',
    });
    const runner = new StubRunner(
      response({
        fromCoinSymbol: 'BTCB',
        fromCoinAmount: '0.0001',
        toCoinSymbol: 'USDT',
        toCoinAmount: '8',
      }),
    );

    await expect(
      new AgenticWalletMarketQuoteAdapter(
        runner,
        5000,
        () => QUOTE_ID,
        () => QUOTED_AT,
      ).load(sellIntent),
    ).resolves.toMatchObject({
      expectedTargetQuantity: '8',
      minimumTargetQuantity: '7.96',
      executable: false,
      costCoverage: 'partial',
    });
  });

  it('rejects an unapproved instrument before provider access', async () => {
    const runner = new StubRunner(response());
    await expect(
      new AgenticWalletMarketQuoteAdapter(runner).load(
        intent({ chainId: '1' }),
      ),
    ).rejects.toThrow('quote chain is not approved');
    expect(runner.commands).toEqual([]);
  });

  it.each([
    [
      'source amount divergence',
      response({ fromCoinAmount: '6' }),
      'source quantity does not match',
    ],
    [
      'symbol divergence',
      response({ toCoinSymbol: 'BNB' }),
      'symbols do not match',
    ],
    ['excess slippage', response({ slippage: 0.006 }), 'slippage exceeds'],
    ['invalid output', response({ toCoinAmount: '0' }), 'target quantity'],
  ])('rejects malformed provider data: %s', async (_name, value, error) => {
    await expect(
      new AgenticWalletMarketQuoteAdapter(
        new StubRunner(value),
        5000,
        () => QUOTE_ID,
        () => QUOTED_AT,
      ).load(intent()),
    ).rejects.toThrow(error);
  });

  it('bounds the locally imposed quote lifetime', () => {
    const runner = new StubRunner(response());
    expect(() => new AgenticWalletMarketQuoteAdapter(runner, 999)).toThrow(
      'quote validity must be between 1000 and 10000 ms',
    );
    expect(() => new AgenticWalletMarketQuoteAdapter(runner, 10001)).toThrow(
      'quote validity must be between 1000 and 10000 ms',
    );
  });
});

class StubRunner implements AgenticWalletQuoteCommandRunner {
  readonly commands: AgenticWalletMarketQuoteCommand[] = [];
  readonly signals: (AbortSignal | undefined)[] = [];

  constructor(private readonly value: unknown) {}

  run(
    command: AgenticWalletMarketQuoteCommand,
    signal?: AbortSignal,
  ): Promise<unknown> {
    this.commands.push(command);
    this.signals.push(signal);
    return Promise.resolve(this.value);
  }
}

function intent(
  overrides: Partial<RealExecutionIntent> = {},
): RealExecutionIntent {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    idempotencyKey: 'quote-investigation-1',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: {
      tokenAddress: '0x55d398326f99059ff775485246999027b3197955',
      symbol: 'USDT',
    },
    targetAsset: {
      tokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
      symbol: 'BTCB',
    },
    sourceQuantity: '5',
    maxSlippageRate: '0.005',
    createdAt: new Date('2026-10-01T13:59:59.000Z'),
    ...overrides,
  };
}

function response(overrides: Record<string, unknown> = {}): unknown {
  return {
    success: true,
    data: {
      fromCoinSymbol: 'USDT',
      fromCoinAmount: '5',
      toCoinSymbol: 'BTCB',
      toCoinAmount: '0.000062',
      slippage: 0.005,
      ...overrides,
    },
  };
}
