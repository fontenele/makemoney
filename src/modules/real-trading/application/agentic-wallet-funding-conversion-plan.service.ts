import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import {
  AgenticWalletFundingConversionQuoteResult,
  AgenticWalletFundingConversionQuoteService,
} from './agentic-wallet-funding-conversion-quote.service';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from '../infrastructure/agentic-wallet-funding-conversion-quote.adapter';
import { AgenticWalletFundingConversionPlanStore } from './agentic-wallet-funding-conversion-plan.store';

const PROVIDER_ID = 'agentic_wallet';
const CHAIN_ID = '56';
const CONFIRMATION_WINDOW_MS = 180_000;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;
const ExactDecimal = Decimal.clone({
  precision: 80,
  toExpNeg: -80,
  toExpPos: 80,
});

export class InvalidFundingConversionPlanRequestError extends Error {}

interface FundingConversionEnvironment {
  readonly TRADING_MODE: 'paper' | 'real';
  readonly REAL_EXECUTION_ENABLED: boolean;
  readonly REAL_EXECUTION_APPROVED_PROVIDER_ID: string | null;
  readonly REAL_EXECUTION_APPROVED_CHAIN_ID: string | null;
  readonly REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS: string | null;
  readonly REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS: string | null;
  readonly FUNDING_CONVERSION_MIN_GAS_RESERVE_BNB: string | null;
}

export type AgenticWalletFundingConversionActivationBlocker =
  | 'trading_mode_not_real'
  | 'real_execution_disabled'
  | 'provider_not_approved'
  | 'chain_not_approved'
  | 'source_token_not_approved'
  | 'target_token_not_approved'
  | 'minimum_gas_reserve_unconfigured'
  | 'remaining_bnb_below_minimum_gas_reserve'
  | 'operator_minimum_above_quote_minimum';

export interface AgenticWalletFundingConversionPlan {
  readonly id: string;
  readonly fingerprint: string;
  readonly provider: 'agentic_wallet';
  readonly chainId: '56';
  readonly sourceTokenAddress: typeof BSC_NATIVE_BNB_ADDRESS;
  readonly targetTokenAddress: typeof BSC_USDT_ADDRESS;
  readonly sourceQuantityBnb: string;
  readonly expectedUsdt: string;
  readonly minimumUsdt: string;
  readonly maximumSlippagePercent: string;
  readonly remainingQuantityBnb: string;
  readonly minimumGasReserveBnb: string | null;
  readonly mevProtection: true;
  readonly gasLevel: 'MEDIUM';
  readonly confirmationPhrase: string;
  readonly quotedAt: Date;
  readonly expiresAt: Date;
  readonly confirmationExpiresAt: Date;
  readonly costCoverage: 'partial';
  readonly gasReserveSufficiency: 'unverified';
  readonly command: {
    readonly kind: 'agentic_wallet_market_order_swap_command_preview';
    readonly arguments: readonly string[];
    readonly executable: false;
  };
  readonly automaticRetryAllowed: false;
  readonly providerSubmissionStarted: false;
  readonly conversionAuthorized: false;
  readonly submissionAuthorized: false;
}

export interface AgenticWalletFundingConversionPlanResult {
  readonly scope: 'agentic_wallet_funding_conversion_plan';
  readonly status: 'plan_ready' | 'blocked';
  readonly quote: AgenticWalletFundingConversionQuoteResult;
  readonly activationBlockers: readonly AgenticWalletFundingConversionActivationBlocker[];
  readonly executionConfigurationReady: boolean;
  readonly finalConfirmationRequired: true;
  readonly plan: AgenticWalletFundingConversionPlan | null;
  readonly providerSubmissionStarted: false;
  readonly conversionAuthorized: false;
  readonly submissionAuthorized: false;
}

@Injectable()
export class AgenticWalletFundingConversionPlanService {
  constructor(
    private readonly quotes: AgenticWalletFundingConversionQuoteService,
    private readonly config: ConfigService<FundingConversionEnvironment, true>,
    private readonly plans: AgenticWalletFundingConversionPlanStore,
  ) {}

  async prepare(
    request: unknown,
  ): Promise<AgenticWalletFundingConversionPlanResult> {
    const input = parsePlanRequest(request);
    const quote = await this.quotes.load({
      sourceQuantityBnb: input.sourceQuantityBnb,
    });
    let activationBlockers = this.activationBlockers();
    if (
      quote.status !== 'quote_available' ||
      quote.quote === null ||
      quote.remainingQuantityBnb === null
    ) {
      return result(quote, activationBlockers, null);
    }
    if (
      new ExactDecimal(input.minimumUsdt).greaterThan(quote.quote.minimumUsdt)
    ) {
      return result(
        quote,
        appendBlocker(
          activationBlockers,
          'operator_minimum_above_quote_minimum',
        ),
        null,
      );
    }

    const id = randomUUID();
    const preparedAt = new Date();
    if (preparedAt.getTime() >= quote.quote.expiresAt.getTime()) {
      throw new Error(
        'Agentic Wallet funding conversion quote expired before plan persistence',
      );
    }
    const minimumGasReserveBnb = this.config.get(
      'FUNDING_CONVERSION_MIN_GAS_RESERVE_BNB',
      { infer: true },
    );
    if (minimumGasReserveBnb === null) {
      activationBlockers = appendBlocker(
        activationBlockers,
        'minimum_gas_reserve_unconfigured',
      );
    } else if (
      new Decimal(quote.remainingQuantityBnb).lessThan(minimumGasReserveBnb)
    ) {
      activationBlockers = appendBlocker(
        activationBlockers,
        'remaining_bnb_below_minimum_gas_reserve',
      );
    }
    const confirmationExpiresAt = new Date(
      preparedAt.getTime() + CONFIRMATION_WINDOW_MS,
    );
    const maximumSlippagePercent = decimalRateToPercent(
      quote.quote.maximumSlippageRate,
    );
    const fingerprint = createFingerprint({
      id,
      sourceQuantityBnb: quote.quote.sourceQuantityBnb,
      expectedUsdt: quote.quote.expectedUsdt,
      minimumUsdt: input.minimumUsdt,
      maximumSlippagePercent,
      remainingQuantityBnb: quote.remainingQuantityBnb,
      minimumGasReserveBnb,
      quotedAt: quote.quote.quotedAt,
      expiresAt: quote.quote.expiresAt,
      confirmationExpiresAt,
    });
    const confirmationPhrase = [
      'CONFIRM_BNB_TO_USDT',
      id,
      quote.quote.sourceQuantityBnb,
      input.minimumUsdt,
      fingerprint,
    ].join(' ');
    const commandArguments = [
      'market-order',
      'swap',
      '--fromTokenQty',
      quote.quote.sourceQuantityBnb,
      '--fromToken',
      BSC_NATIVE_BNB_ADDRESS,
      '--toToken',
      BSC_USDT_ADDRESS,
      '--binanceChainId',
      CHAIN_ID,
      '--slippage',
      maximumSlippagePercent,
      '--mev',
      'true',
      '--gasLevel',
      'MEDIUM',
      '--json',
    ] as const;

    const plan: AgenticWalletFundingConversionPlan = {
      id,
      fingerprint,
      provider: PROVIDER_ID,
      chainId: CHAIN_ID,
      sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS,
      targetTokenAddress: BSC_USDT_ADDRESS,
      sourceQuantityBnb: quote.quote.sourceQuantityBnb,
      expectedUsdt: quote.quote.expectedUsdt,
      minimumUsdt: input.minimumUsdt,
      maximumSlippagePercent,
      remainingQuantityBnb: quote.remainingQuantityBnb,
      minimumGasReserveBnb,
      mevProtection: true,
      gasLevel: 'MEDIUM',
      confirmationPhrase,
      quotedAt: new Date(quote.quote.quotedAt),
      expiresAt: new Date(quote.quote.expiresAt),
      confirmationExpiresAt,
      costCoverage: 'partial',
      gasReserveSufficiency: 'unverified',
      command: {
        kind: 'agentic_wallet_market_order_swap_command_preview',
        arguments: commandArguments,
        executable: false,
      },
      automaticRetryAllowed: false,
      providerSubmissionStarted: false,
      conversionAuthorized: false,
      submissionAuthorized: false,
    };
    await this.plans.create({
      plan,
      confirmationPhraseDigest: createHash('sha256')
        .update(confirmationPhrase)
        .digest('hex'),
      activationBlockers,
      executionConfigurationReady: activationBlockers.length === 0,
      preparedAt,
    });
    return result(quote, activationBlockers, plan);
  }

  private activationBlockers(): AgenticWalletFundingConversionActivationBlocker[] {
    const blockers: AgenticWalletFundingConversionActivationBlocker[] = [];
    addIf(
      blockers,
      this.config.get('TRADING_MODE', { infer: true }) !== 'real',
      'trading_mode_not_real',
    );
    addIf(
      blockers,
      this.config.get('REAL_EXECUTION_ENABLED', { infer: true }) !== true,
      'real_execution_disabled',
    );
    addIf(
      blockers,
      this.config.get('REAL_EXECUTION_APPROVED_PROVIDER_ID', {
        infer: true,
      }) !== PROVIDER_ID,
      'provider_not_approved',
    );
    addIf(
      blockers,
      this.config.get('REAL_EXECUTION_APPROVED_CHAIN_ID', { infer: true }) !==
        CHAIN_ID,
      'chain_not_approved',
    );
    addIf(
      blockers,
      lower(
        this.config.get('REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS', {
          infer: true,
        }),
      ) !== BSC_NATIVE_BNB_ADDRESS.toLowerCase(),
      'source_token_not_approved',
    );
    addIf(
      blockers,
      lower(
        this.config.get('REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS', {
          infer: true,
        }),
      ) !== BSC_USDT_ADDRESS.toLowerCase(),
      'target_token_not_approved',
    );
    return blockers;
  }
}

function result(
  quote: AgenticWalletFundingConversionQuoteResult,
  activationBlockers: readonly AgenticWalletFundingConversionActivationBlocker[],
  plan: AgenticWalletFundingConversionPlan | null,
): AgenticWalletFundingConversionPlanResult {
  return {
    scope: 'agentic_wallet_funding_conversion_plan',
    status: plan === null ? 'blocked' : 'plan_ready',
    quote,
    activationBlockers: [...activationBlockers],
    executionConfigurationReady: activationBlockers.length === 0,
    finalConfirmationRequired: true,
    plan,
    providerSubmissionStarted: false,
    conversionAuthorized: false,
    submissionAuthorized: false,
  };
}

function createFingerprint(input: {
  readonly id: string;
  readonly sourceQuantityBnb: string;
  readonly expectedUsdt: string;
  readonly minimumUsdt: string;
  readonly maximumSlippagePercent: string;
  readonly remainingQuantityBnb: string;
  readonly minimumGasReserveBnb: string | null;
  readonly quotedAt: Date;
  readonly expiresAt: Date;
  readonly confirmationExpiresAt: Date;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        version: 'agentic_wallet_funding_conversion_plan_v4',
        id: input.id,
        provider: PROVIDER_ID,
        chainId: CHAIN_ID,
        sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(),
        targetTokenAddress: BSC_USDT_ADDRESS.toLowerCase(),
        sourceQuantityBnb: input.sourceQuantityBnb,
        expectedUsdt: input.expectedUsdt,
        minimumUsdt: input.minimumUsdt,
        maximumSlippagePercent: input.maximumSlippagePercent,
        remainingQuantityBnb: input.remainingQuantityBnb,
        minimumGasReserveBnb: input.minimumGasReserveBnb,
        mevProtection: true,
        gasLevel: 'MEDIUM',
        quotedAt: input.quotedAt.toISOString(),
        expiresAt: input.expiresAt.toISOString(),
        confirmationExpiresAt: input.confirmationExpiresAt.toISOString(),
      }),
    )
    .digest('hex');
}

function parsePlanRequest(value: unknown): {
  sourceQuantityBnb: string;
  minimumUsdt: string;
} {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length !== 2 ||
    !('sourceQuantityBnb' in value) ||
    !('minimumUsdt' in value) ||
    typeof value.sourceQuantityBnb !== 'string' ||
    typeof value.minimumUsdt !== 'string' ||
    !POSITIVE_DECIMAL_PATTERN.test(value.sourceQuantityBnb) ||
    !POSITIVE_DECIMAL_PATTERN.test(value.minimumUsdt)
  ) {
    throw new InvalidFundingConversionPlanRequestError(
      'sourceQuantityBnb and minimumUsdt must be canonical positive decimal strings',
    );
  }
  return {
    sourceQuantityBnb: new ExactDecimal(value.sourceQuantityBnb).toFixed(),
    minimumUsdt: new ExactDecimal(value.minimumUsdt).toFixed(),
  };
}

function decimalRateToPercent(rate: string): string {
  return new Decimal(rate).times(100).toFixed();
}

function lower(value: string | null): string | null {
  return value === null ? null : value.toLowerCase();
}

function addIf(
  blockers: AgenticWalletFundingConversionActivationBlocker[],
  condition: boolean,
  blocker: AgenticWalletFundingConversionActivationBlocker,
): void {
  if (condition) blockers.push(blocker);
}

function appendBlocker(
  blockers: readonly AgenticWalletFundingConversionActivationBlocker[],
  blocker: AgenticWalletFundingConversionActivationBlocker,
): AgenticWalletFundingConversionActivationBlocker[] {
  return blockers.includes(blocker) ? [...blockers] : [...blockers, blocker];
}
