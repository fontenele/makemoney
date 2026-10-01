import {
  AgenticWalletQuoteCliProcessRunner,
  buildAgenticWalletQuoteArguments,
  validateAgenticWalletQuoteCliVersion,
} from './agentic-wallet-quote-cli-process-runner';
import { AgenticWalletMarketQuoteCommand } from './agentic-wallet-quote-command-runner';

describe('AgenticWalletQuoteCliProcessRunner', () => {
  it('accepts only bounded process timeouts', () => {
    expect(() => new AgenticWalletQuoteCliProcessRunner(999)).toThrow(
      'Agentic Wallet CLI timeout must be between 1000 and 30000 ms',
    );
    expect(() => new AgenticWalletQuoteCliProcessRunner(30000)).not.toThrow();
  });
});

describe('buildAgenticWalletQuoteArguments', () => {
  it('maps only the non-mutating market quote to a closed argument array', () => {
    expect(buildAgenticWalletQuoteArguments(command())).toEqual([
      'market-order',
      'quote',
      '--fromTokenQty',
      '5',
      '--fromToken',
      '0x55d398326f99059ff775485246999027b3197955',
      '--toToken',
      '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
      '--binanceChainId',
      '56',
      '--slippage',
      '0.5',
      '--json',
    ]);
  });

  it.each([
    [{ chainId: '56;swap' }, 'chain id'],
    [{ sourceTokenAddress: '0xinvalid' }, 'token addresses'],
    [
      {
        targetTokenAddress: '0x55d398326f99059ff775485246999027b3197955',
      },
      'token addresses',
    ],
    [{ sourceQuantity: '0' }, 'source quantity'],
    [{ maximumSlippagePercent: '100.1' }, 'slippage percent'],
  ])('rejects unsafe quote arguments %#', (overrides, error) => {
    expect(() => buildAgenticWalletQuoteArguments(command(overrides))).toThrow(
      error,
    );
  });
});

describe('validateAgenticWalletQuoteCliVersion', () => {
  it('accepts only the pinned successful CLI contract', () => {
    expect(() =>
      validateAgenticWalletQuoteCliVersion({
        success: true,
        data: { currentCliVersion: '1.10.0', needUpdateCli: false },
      }),
    ).not.toThrow();
    expect(() =>
      validateAgenticWalletQuoteCliVersion({
        success: true,
        data: { currentCliVersion: '1.11.0', needUpdateCli: false },
      }),
    ).toThrow('does not match the pinned version');
    expect(() => validateAgenticWalletQuoteCliVersion(null)).toThrow(
      'version response is invalid',
    );
  });
});

function command(
  overrides: Partial<AgenticWalletMarketQuoteCommand> = {},
): AgenticWalletMarketQuoteCommand {
  return {
    kind: 'market_order_quote',
    chainId: '56',
    sourceTokenAddress: '0x55d398326f99059ff775485246999027b3197955',
    targetTokenAddress: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
    sourceQuantity: '5',
    maximumSlippagePercent: '0.5',
    ...overrides,
  };
}
