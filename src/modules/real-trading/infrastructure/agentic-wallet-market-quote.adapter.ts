import { randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import {
  RealExecutionIntent,
  RealExecutionQuote,
  validateRealExecutionIntent,
  validateRealExecutionQuote,
} from '../domain/real-execution';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from '../application/real-execution-instrument-approval';
import { AgenticWalletQuoteCommandRunner } from './agentic-wallet-quote-command-runner';

const ExactDecimal = Decimal.clone({
  precision: 80,
  rounding: Decimal.ROUND_DOWN,
  toExpNeg: -80,
  toExpPos: 80,
});
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;
const SYMBOL_PATTERN = /^[A-Z0-9][A-Z0-9._-]{0,31}$/;

export class AgenticWalletMarketQuoteAdapter {
  constructor(
    private readonly runner: AgenticWalletQuoteCommandRunner,
    private readonly quoteTtlMs = 5000,
    private readonly createId: () => string = randomUUID,
    private readonly now: () => Date = () => new Date(),
  ) {
    if (
      !Number.isInteger(quoteTtlMs) ||
      quoteTtlMs < 1000 ||
      quoteTtlMs > 10000
    ) {
      throw new Error(
        'Agentic Wallet quote validity must be between 1000 and 10000 ms',
      );
    }
  }

  async load(
    intent: RealExecutionIntent,
    signal?: AbortSignal,
  ): Promise<RealExecutionQuote> {
    validateRealExecutionIntent(intent);
    const direction = approvedDirection(intent);
    const maximumSlippage = new ExactDecimal(intent.maxSlippageRate);
    if (maximumSlippage.greaterThanOrEqualTo(1)) {
      throw new Error('Agentic Wallet quote slippage must be less than one');
    }

    const response = await this.runner.run(
      {
        kind: 'market_order_quote',
        chainId: intent.chainId,
        sourceTokenAddress: intent.sourceAsset.tokenAddress,
        targetTokenAddress: intent.targetAsset.tokenAddress,
        sourceQuantity: intent.sourceQuantity,
        maximumSlippagePercent: maximumSlippage.times(100).toFixed(),
      },
      signal,
    );
    const data = record(envelopeData(response));
    const sourceSymbol = symbol(data.fromCoinSymbol, 'source symbol');
    const sourceQuantity = positiveDecimal(
      data.fromCoinAmount,
      'source quantity',
    );
    const targetSymbol = symbol(data.toCoinSymbol, 'target symbol');
    const expectedTargetQuantity = positiveDecimal(
      data.toCoinAmount,
      'target quantity',
    );
    const observedSlippage = decimal(data.slippage, 'slippage');

    if (
      sourceSymbol !== direction.sourceSymbol ||
      targetSymbol !== direction.targetSymbol
    ) {
      throw new Error('Agentic Wallet quote symbols do not match the intent');
    }
    if (!new ExactDecimal(sourceQuantity).equals(intent.sourceQuantity)) {
      throw new Error(
        'Agentic Wallet quote source quantity does not match the intent',
      );
    }
    if (new ExactDecimal(observedSlippage).greaterThan(maximumSlippage)) {
      throw new Error('Agentic Wallet quote slippage exceeds the intent');
    }

    const quotedAt = this.now();
    validateDate(quotedAt);
    const quote: RealExecutionQuote = {
      id: this.createId(),
      providerId: 'agentic_wallet',
      providerQuoteId: null,
      intent,
      expectedTargetQuantity,
      minimumTargetQuantity: new ExactDecimal(expectedTargetQuantity)
        .times(new ExactDecimal(1).minus(maximumSlippage))
        .toFixed(),
      costs: [],
      costCoverage: 'partial',
      quotedAt,
      expiresAt: new Date(quotedAt.getTime() + this.quoteTtlMs),
      executable: false,
    };
    validateRealExecutionQuote(quote);
    return quote;
  }
}

function approvedDirection(intent: RealExecutionIntent): {
  sourceSymbol: 'BTCB' | 'USDT';
  targetSymbol: 'BTCB' | 'USDT';
} {
  const approved = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  const source = intent.sourceAsset.tokenAddress.toLowerCase();
  const target = intent.targetAsset.tokenAddress.toLowerCase();
  const btc = approved.btc.tokenAddress;
  const usdt = approved.usdt.tokenAddress;
  if (intent.chainId !== approved.chainId) {
    throw new Error('Agentic Wallet quote chain is not approved');
  }
  if (source === usdt && target === btc) {
    return { sourceSymbol: 'USDT', targetSymbol: 'BTCB' };
  }
  if (source === btc && target === usdt) {
    return { sourceSymbol: 'BTCB', targetSymbol: 'USDT' };
  }
  throw new Error('Agentic Wallet quote token direction is not approved');
}

function envelopeData(value: unknown): unknown {
  const envelope = record(value);
  if (envelope.success !== true || !('data' in envelope)) {
    throw new Error('Agentic Wallet quote command was unsuccessful');
  }
  return envelope.data;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Agentic Wallet quote response object is invalid');
  }
  return value as Record<string, unknown>;
}

function symbol(value: unknown, field: string): string {
  if (typeof value !== 'string' || !SYMBOL_PATTERN.test(value)) {
    throw new Error(`Agentic Wallet quote ${field} is invalid`);
  }
  return value;
}

function positiveDecimal(value: unknown, field: string): string {
  if (typeof value !== 'string' || !POSITIVE_DECIMAL_PATTERN.test(value)) {
    throw new Error(`Agentic Wallet quote ${field} is invalid`);
  }
  return value;
}

function decimal(value: unknown, field: string): string {
  const normalized =
    typeof value === 'number' && Number.isFinite(value)
      ? value.toString()
      : value;
  if (typeof normalized !== 'string') {
    throw new Error(`Agentic Wallet quote ${field} is invalid`);
  }
  try {
    const result = new ExactDecimal(normalized);
    if (result.isNegative() || result.greaterThan(1)) throw new Error();
    return result.toFixed();
  } catch {
    throw new Error(`Agentic Wallet quote ${field} is invalid`);
  }
}

function validateDate(value: Date): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error('Agentic Wallet quote observation time is invalid');
  }
}
