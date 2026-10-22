import { AgenticWalletMarketQuoteCommand } from './agentic-wallet-quote-command-runner';
import {
  AgenticWalletFundingConversionQuoteAdapter,
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';

describe('AgenticWalletFundingConversionQuoteAdapter', () => {
  const quotedAt = new Date('2026-10-22T12:00:00.000Z');

  it('loads a non-executable BNB-to-USDT quote with the official native-token identity', async () => {
    const runner = new StubRunner(response());
    const adapter = new AgenticWalletFundingConversionQuoteAdapter(
      runner,
      5000,
      () => quotedAt,
    );

    await expect(adapter.load('0.008', '0.005')).resolves.toEqual({
      provider: 'agentic_wallet',
      sourceQuantityBnb: '0.008',
      expectedUsdt: '5.92',
      minimumUsdt: '5.8904',
      observedSlippageRate: '0.005',
      maximumSlippageRate: '0.005',
      quotedAt,
      expiresAt: new Date('2026-10-22T12:00:05.000Z'),
      costCoverage: 'partial',
      executable: false,
    });
    expect(runner.commands).toEqual([
      {
        kind: 'market_order_quote',
        chainId: '56',
        sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS,
        targetTokenAddress: BSC_USDT_ADDRESS,
        sourceQuantity: '0.008',
        maximumSlippagePercent: '0.5',
      },
    ]);
  });

  it.each([
    [response({ fromCoinSymbol: 'WBNB' }), 'symbols are invalid'],
    [response({ fromCoinAmount: '0.007' }), 'source quantity diverged'],
    [response({ toCoinAmount: '0' }), 'expected USDT quantity is invalid'],
    [response({ slippage: 0.006 }), 'slippage exceeds the maximum'],
    [{ success: false }, 'command was unsuccessful'],
  ])('rejects divergent provider evidence %#', async (value, message) => {
    await expect(
      new AgenticWalletFundingConversionQuoteAdapter(
        new StubRunner(value),
      ).load('0.008', '0.005'),
    ).rejects.toThrow(message);
  });

  it('rejects invalid input before provider access', async () => {
    const runner = new StubRunner(response());
    const adapter = new AgenticWalletFundingConversionQuoteAdapter(runner);
    await expect(adapter.load('0', '0.005')).rejects.toThrow(
      'source quantity is invalid',
    );
    await expect(adapter.load('0.008', '1')).rejects.toThrow(
      'maximum slippage must be less than one',
    );
    expect(runner.commands).toEqual([]);
  });
});

class StubRunner {
  readonly commands: AgenticWalletMarketQuoteCommand[] = [];

  constructor(private readonly result: unknown) {}

  run(command: AgenticWalletMarketQuoteCommand): Promise<unknown> {
    this.commands.push(command);
    return Promise.resolve(this.result);
  }
}

function response(overrides: Record<string, unknown> = {}): unknown {
  return {
    success: true,
    data: {
      fromCoinSymbol: 'BNB',
      fromCoinAmount: '0.008',
      toCoinSymbol: 'USDT',
      toCoinAmount: '5.92',
      slippage: 0.005,
      ...overrides,
    },
  };
}
