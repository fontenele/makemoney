import {
  AgenticWalletFundingConversionSwapCommand,
  buildAgenticWalletFundingConversionSwapArguments,
  validateAgenticWalletFundingConversionSwapCliVersion,
} from './agentic-wallet-funding-conversion-swap-command-runner';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';

describe('Agentic Wallet funding conversion swap command runner', () => {
  it('builds only the pinned BNB-to-USDT BSC swap invocation', () => {
    expect(buildAgenticWalletFundingConversionSwapArguments(command())).toEqual(
      [
        'market-order',
        'swap',
        '--fromTokenQty',
        '0.008',
        '--fromToken',
        BSC_NATIVE_BNB_ADDRESS,
        '--toToken',
        BSC_USDT_ADDRESS,
        '--binanceChainId',
        '56',
        '--slippage',
        '0.5',
        '--mev',
        'true',
        '--gasLevel',
        'MEDIUM',
        '--json',
      ],
    );
  });

  it.each([
    { kind: 'market_order_quote' },
    { chainId: '1' },
    { sourceTokenAddress: BSC_USDT_ADDRESS },
    { targetTokenAddress: BSC_NATIVE_BNB_ADDRESS },
    { mevProtection: false },
    { gasLevel: 'HIGH' },
  ])('rejects an altered approved envelope %#', (change) => {
    expect(() =>
      buildAgenticWalletFundingConversionSwapArguments({
        ...command(),
        ...change,
      } as AgenticWalletFundingConversionSwapCommand),
    ).toThrow('outside the approved envelope');
  });

  it.each(['0', '-0.008', '01', '1e-3'])(
    'rejects invalid quantity %s',
    (value) => {
      expect(() =>
        buildAgenticWalletFundingConversionSwapArguments({
          ...command(),
          sourceQuantityBnb: value,
        }),
      ).toThrow('quantity must be positive');
    },
  );

  it.each(['-1', '100.1', 'auto'])('rejects invalid slippage %s', (value) => {
    expect(() =>
      buildAgenticWalletFundingConversionSwapArguments({
        ...command(),
        maximumSlippagePercent: value,
      }),
    ).toThrow('slippage must be between zero and 100');
  });

  it('accepts only the pinned CLI version envelope', () => {
    expect(() =>
      validateAgenticWalletFundingConversionSwapCliVersion({
        success: true,
        data: { currentCliVersion: '1.10.0', needUpdateCli: false },
      }),
    ).not.toThrow();
    expect(() =>
      validateAgenticWalletFundingConversionSwapCliVersion({
        success: true,
        data: { currentCliVersion: '1.11.0', needUpdateCli: false },
      }),
    ).toThrow('does not match the pinned version');
  });
});

function command(): AgenticWalletFundingConversionSwapCommand {
  return {
    kind: 'funding_conversion_market_order_swap',
    chainId: '56',
    sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS,
    targetTokenAddress: BSC_USDT_ADDRESS,
    sourceQuantityBnb: '0.008',
    maximumSlippagePercent: '0.5',
    mevProtection: true,
    gasLevel: 'MEDIUM',
  };
}
