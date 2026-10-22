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

interface FundingConversionEnvironment {
  readonly TRADING_MODE: 'paper' | 'real';
  readonly REAL_EXECUTION_ENABLED: boolean;
  readonly REAL_EXECUTION_APPROVED_PROVIDER_ID: string | null;
  readonly REAL_EXECUTION_APPROVED_CHAIN_ID: string | null;
  readonly REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS: string | null;
  readonly REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS: string | null;
}

export type AgenticWalletFundingConversionActivationBlocker =
  | 'trading_mode_not_real'
  | 'real_execution_disabled'
  | 'provider_not_approved'
  | 'chain_not_approved'
  | 'source_token_not_approved'
  | 'target_token_not_approved';

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
  readonly mevProtection: true;
  readonly gasLevel: 'MEDIUM';
  readonly confirmationPhrase: string;
  readonly quotedAt: Date;
  readonly expiresAt: Date;
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
    const quote = await this.quotes.load(request);
    const activationBlockers = this.activationBlockers();
    if (
      quote.status !== 'quote_available' ||
      quote.quote === null ||
      quote.remainingQuantityBnb === null
    ) {
      return result(quote, activationBlockers, null);
    }

    const id = randomUUID();
    const maximumSlippagePercent = decimalRateToPercent(
      quote.quote.maximumSlippageRate,
    );
    const fingerprint = createFingerprint({
      id,
      sourceQuantityBnb: quote.quote.sourceQuantityBnb,
      expectedUsdt: quote.quote.expectedUsdt,
      minimumUsdt: quote.quote.minimumUsdt,
      maximumSlippagePercent,
      remainingQuantityBnb: quote.remainingQuantityBnb,
      quotedAt: quote.quote.quotedAt,
      expiresAt: quote.quote.expiresAt,
    });
    const confirmationPhrase = [
      'CONFIRM_BNB_TO_USDT',
      id,
      quote.quote.sourceQuantityBnb,
      quote.quote.minimumUsdt,
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
      minimumUsdt: quote.quote.minimumUsdt,
      maximumSlippagePercent,
      remainingQuantityBnb: quote.remainingQuantityBnb,
      mevProtection: true,
      gasLevel: 'MEDIUM',
      confirmationPhrase,
      quotedAt: new Date(quote.quote.quotedAt),
      expiresAt: new Date(quote.quote.expiresAt),
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
    const preparedAt = new Date();
    if (preparedAt.getTime() >= plan.expiresAt.getTime()) {
      throw new Error(
        'Agentic Wallet funding conversion quote expired before plan persistence',
      );
    }
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
  readonly quotedAt: Date;
  readonly expiresAt: Date;
}): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        version: 'agentic_wallet_funding_conversion_plan_v1',
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
        mevProtection: true,
        gasLevel: 'MEDIUM',
        quotedAt: input.quotedAt.toISOString(),
        expiresAt: input.expiresAt.toISOString(),
      }),
    )
    .digest('hex');
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
