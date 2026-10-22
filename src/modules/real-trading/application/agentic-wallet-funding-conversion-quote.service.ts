import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { RealTradingStatusService } from './real-trading-status.service';
import {
  AgenticWalletFundingConversionProviderQuote,
  AgenticWalletFundingConversionQuoteAdapter,
} from '../infrastructure/agentic-wallet-funding-conversion-quote.adapter';

const ExactDecimal = Decimal.clone({
  precision: 80,
  toExpNeg: -80,
  toExpPos: 80,
});
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;

export class InvalidFundingConversionQuoteRequestError extends Error {}

export type AgenticWalletFundingConversionQuoteBlocker =
  | 'funding_verification_blocked'
  | 'bnb_not_reported'
  | 'maximum_slippage_unconfigured'
  | 'source_quantity_must_leave_bnb_for_gas';

export interface AgenticWalletFundingConversionQuoteResult {
  readonly scope: 'agentic_wallet_funding_conversion_quote';
  readonly status: 'quote_available' | 'blocked';
  readonly blockers: readonly AgenticWalletFundingConversionQuoteBlocker[];
  readonly balanceObservedAt: Date;
  readonly walletBalanceBnb: string | null;
  readonly requestedQuantityBnb: string;
  readonly remainingQuantityBnb: string | null;
  readonly gasReserveSufficiency: 'unverified';
  readonly quote: AgenticWalletFundingConversionProviderQuote | null;
  readonly providerCallStarted: boolean;
  readonly automaticRefresh: false;
  readonly conversionAuthorized: false;
  readonly submissionAuthorized: false;
}

@Injectable()
export class AgenticWalletFundingConversionQuoteService {
  constructor(
    private readonly status: RealTradingStatusService,
    private readonly provider: AgenticWalletFundingConversionQuoteAdapter,
  ) {}

  async load(
    request: unknown,
  ): Promise<AgenticWalletFundingConversionQuoteResult> {
    const requestedQuantityBnb = parseRequest(request);
    const verification = await this.status.verifyFunding();
    const bnb = verification.assets.find((asset) => asset.symbol === 'BNB');
    const maximumSlippageRate =
      this.status.getLocalStatus().localRiskLimits.limits.maximumSlippageRate;
    const walletBalanceBnb = bnb?.quantity ?? null;
    const blockers: AgenticWalletFundingConversionQuoteBlocker[] = [];
    if (verification.status !== 'funds_observed') {
      blockers.push('funding_verification_blocked');
    }
    if (bnb?.quantity === null || bnb?.quantity === undefined) {
      blockers.push('bnb_not_reported');
    }
    if (maximumSlippageRate === null) {
      blockers.push('maximum_slippage_unconfigured');
    }

    let remainingQuantityBnb: string | null = null;
    if (bnb?.quantity !== null && bnb?.quantity !== undefined) {
      const balance = new ExactDecimal(bnb.quantity);
      const requested = new ExactDecimal(requestedQuantityBnb);
      if (requested.greaterThanOrEqualTo(balance)) {
        blockers.push('source_quantity_must_leave_bnb_for_gas');
      } else {
        remainingQuantityBnb = balance.minus(requested).toFixed();
      }
    }
    if (blockers.length !== 0 || maximumSlippageRate === null) {
      return {
        scope: 'agentic_wallet_funding_conversion_quote',
        status: 'blocked',
        blockers,
        balanceObservedAt: verification.observedAt,
        walletBalanceBnb,
        requestedQuantityBnb,
        remainingQuantityBnb,
        gasReserveSufficiency: 'unverified',
        quote: null,
        providerCallStarted: false,
        automaticRefresh: false,
        conversionAuthorized: false,
        submissionAuthorized: false,
      };
    }

    if (walletBalanceBnb === null || remainingQuantityBnb === null) {
      throw new Error(
        'Agentic Wallet funding conversion admitted invalid balance state',
      );
    }

    const quote = await this.provider.load(
      requestedQuantityBnb,
      maximumSlippageRate,
    );
    return {
      scope: 'agentic_wallet_funding_conversion_quote',
      status: 'quote_available',
      blockers: [],
      balanceObservedAt: verification.observedAt,
      walletBalanceBnb,
      requestedQuantityBnb,
      remainingQuantityBnb,
      gasReserveSufficiency: 'unverified',
      quote,
      providerCallStarted: true,
      automaticRefresh: false,
      conversionAuthorized: false,
      submissionAuthorized: false,
    };
  }
}

function parseRequest(value: unknown): string {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length !== 1 ||
    !('sourceQuantityBnb' in value) ||
    typeof value.sourceQuantityBnb !== 'string' ||
    !POSITIVE_DECIMAL_PATTERN.test(value.sourceQuantityBnb)
  ) {
    throw new InvalidFundingConversionQuoteRequestError(
      'sourceQuantityBnb must be one canonical positive decimal string',
    );
  }
  return new ExactDecimal(value.sourceQuantityBnb).toFixed();
}
