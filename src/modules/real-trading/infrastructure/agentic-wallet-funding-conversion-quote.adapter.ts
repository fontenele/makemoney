import Decimal from 'decimal.js';
import { AgenticWalletQuoteCommandRunner } from './agentic-wallet-quote-command-runner';

export const BSC_NATIVE_BNB_ADDRESS =
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
export const BSC_USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';

const ExactDecimal = Decimal.clone({
  precision: 80,
  rounding: Decimal.ROUND_DOWN,
  toExpNeg: -80,
  toExpPos: 80,
});
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;

export interface AgenticWalletFundingConversionProviderQuote {
  readonly provider: 'agentic_wallet';
  readonly sourceQuantityBnb: string;
  readonly expectedUsdt: string;
  readonly minimumUsdt: string;
  readonly observedSlippageRate: string;
  readonly maximumSlippageRate: string;
  readonly quotedAt: Date;
  readonly expiresAt: Date;
  readonly costCoverage: 'partial';
  readonly executable: false;
}

export class AgenticWalletFundingConversionQuoteAdapter {
  constructor(
    private readonly runner: AgenticWalletQuoteCommandRunner,
    private readonly quoteTtlMs = 5000,
    private readonly now: () => Date = () => new Date(),
  ) {
    if (
      !Number.isInteger(quoteTtlMs) ||
      quoteTtlMs < 1000 ||
      quoteTtlMs > 10000
    ) {
      throw new Error(
        'Agentic Wallet funding conversion quote validity is invalid',
      );
    }
  }

  async load(
    sourceQuantityBnb: string,
    maximumSlippageRate: string,
    signal?: AbortSignal,
  ): Promise<AgenticWalletFundingConversionProviderQuote> {
    const sourceQuantity = positiveDecimal(
      sourceQuantityBnb,
      'source quantity',
    );
    const maximumSlippage = rate(maximumSlippageRate, 'maximum slippage rate');
    if (maximumSlippage.greaterThanOrEqualTo(1)) {
      throw new Error(
        'Agentic Wallet funding conversion maximum slippage must be less than one',
      );
    }

    const response = await this.runner.run(
      {
        kind: 'market_order_quote',
        chainId: '56',
        sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS,
        targetTokenAddress: BSC_USDT_ADDRESS,
        sourceQuantity,
        maximumSlippagePercent: maximumSlippage.times(100).toFixed(),
      },
      signal,
    );
    const data = record(envelopeData(response));
    const returnedSource = positiveDecimal(
      data.fromCoinAmount,
      'returned source quantity',
    );
    const expectedUsdt = positiveDecimal(
      data.toCoinAmount,
      'expected USDT quantity',
    );
    const observedSlippage = rate(data.slippage, 'observed slippage rate');

    if (data.fromCoinSymbol !== 'BNB' || data.toCoinSymbol !== 'USDT') {
      throw new Error(
        'Agentic Wallet funding conversion quote symbols are invalid',
      );
    }
    if (!new ExactDecimal(returnedSource).equals(sourceQuantity)) {
      throw new Error(
        'Agentic Wallet funding conversion source quantity diverged',
      );
    }
    if (observedSlippage.greaterThan(maximumSlippage)) {
      throw new Error(
        'Agentic Wallet funding conversion slippage exceeds the maximum',
      );
    }

    const quotedAt = this.now();
    if (!(quotedAt instanceof Date) || !Number.isFinite(quotedAt.getTime())) {
      throw new Error(
        'Agentic Wallet funding conversion quote time is invalid',
      );
    }
    return {
      provider: 'agentic_wallet',
      sourceQuantityBnb: sourceQuantity,
      expectedUsdt,
      minimumUsdt: new ExactDecimal(expectedUsdt)
        .times(new ExactDecimal(1).minus(maximumSlippage))
        .toFixed(),
      observedSlippageRate: observedSlippage.toFixed(),
      maximumSlippageRate: maximumSlippage.toFixed(),
      quotedAt,
      expiresAt: new Date(quotedAt.getTime() + this.quoteTtlMs),
      costCoverage: 'partial',
      executable: false,
    };
  }
}

function envelopeData(value: unknown): unknown {
  const envelope = record(value);
  if (envelope.success !== true || !('data' in envelope)) {
    throw new Error(
      'Agentic Wallet funding conversion quote command was unsuccessful',
    );
  }
  return envelope.data;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(
      'Agentic Wallet funding conversion quote response is invalid',
    );
  }
  return value as Record<string, unknown>;
}

function positiveDecimal(value: unknown, field: string): string {
  if (typeof value !== 'string' || !POSITIVE_DECIMAL_PATTERN.test(value)) {
    throw new Error(`Agentic Wallet funding conversion ${field} is invalid`);
  }
  return new ExactDecimal(value).toFixed();
}

function rate(value: unknown, field: string): Decimal {
  const normalized =
    typeof value === 'number' && Number.isFinite(value)
      ? value.toString()
      : value;
  if (typeof normalized !== 'string') {
    throw new Error(`Agentic Wallet funding conversion ${field} is invalid`);
  }
  try {
    const parsed = new ExactDecimal(normalized);
    if (parsed.isNegative() || parsed.greaterThan(1)) throw new Error();
    return parsed;
  } catch {
    throw new Error(`Agentic Wallet funding conversion ${field} is invalid`);
  }
}
