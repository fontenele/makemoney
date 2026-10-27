import { randomUUID } from 'node:crypto';

import { ConfigService } from '@nestjs/config';
import Decimal from 'decimal.js';

import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from '../infrastructure/agentic-wallet-funding-conversion-quote.adapter';
import { AgenticWalletFundingConversionSwapCommandRunner } from '../infrastructure/agentic-wallet-funding-conversion-swap-command-runner';
import { assessAgenticWalletFundingConversionSubmissionResponse } from '../infrastructure/agentic-wallet-funding-conversion-submission-response';
import { AgenticWalletFundingConversionQuoteService } from './agentic-wallet-funding-conversion-quote.service';
import { AgenticWalletFundingConversionSubmissionAttemptStore } from './agentic-wallet-funding-conversion-submission-attempt.store';
import { AgenticWalletFundingConversionSubmissionOutcomeStore } from './agentic-wallet-funding-conversion-submission-outcome.store';
import { AgenticWalletFundingConversionPreBalanceReader } from './agentic-wallet-funding-conversion-pre-balance.reader';
import { AgenticWalletFundingConversionFeeEvidenceReader } from './agentic-wallet-funding-conversion-fee-evidence.reader';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;

export interface FundingConversionSubmissionEnvironment {
  readonly TRADING_MODE: 'paper' | 'real';
  readonly REAL_EXECUTION_ENABLED: boolean;
  readonly REAL_EXECUTION_APPROVED_PROVIDER_ID: string | null;
  readonly REAL_EXECUTION_APPROVED_CHAIN_ID: string | null;
  readonly REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS: string | null;
  readonly REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS: string | null;
  readonly FUNDING_CONVERSION_MIN_GAS_RESERVE_BNB: string | null;
}

interface EmergencyStopStatus {
  isActive(): boolean;
}

export interface FundingConversionSubmissionRequest {
  readonly planId: string;
  readonly planFingerprint: string;
  readonly confirmationPhrase: string;
  readonly sourceQuantityBnb: string;
}

export class InvalidFundingConversionSubmissionRequestError extends Error {}
export class FundingConversionSubmissionBlockedError extends Error {
  constructor(readonly blocker: string) {
    super(`Funding conversion submission blocked: ${blocker}`);
  }
}
export type FundingConversionSubmissionDependencyStage =
  | 'preliminary_quote'
  | 'pre_conversion_balance'
  | 'fee_evidence'
  | 'final_quote';
export class FundingConversionSubmissionDependencyUnavailableError extends Error {
  constructor(readonly stage: FundingConversionSubmissionDependencyStage) {
    super(`Funding conversion submission dependency unavailable: ${stage}`);
  }
}

export class AgenticWalletFundingConversionSubmissionService {
  constructor(
    private readonly quotes: AgenticWalletFundingConversionQuoteService,
    private readonly config: ConfigService<
      FundingConversionSubmissionEnvironment,
      true
    >,
    private readonly emergencyStop: EmergencyStopStatus,
    private readonly preBalances: AgenticWalletFundingConversionPreBalanceReader,
    private readonly feeEvidence: AgenticWalletFundingConversionFeeEvidenceReader,
    private readonly attempts: AgenticWalletFundingConversionSubmissionAttemptStore,
    private readonly runner: AgenticWalletFundingConversionSwapCommandRunner,
    private readonly outcomes: AgenticWalletFundingConversionSubmissionOutcomeStore,
    private readonly now: () => Date = () => new Date(),
    private readonly newId: () => string = randomUUID,
  ) {}

  async submit(request: unknown) {
    const input = parseRequest(request);
    this.assertRuntimeReady();
    this.assertEmergencyStopInactive();

    const preliminaryQuote = await this.loadDependency(
      'preliminary_quote',
      () =>
        this.quotes.load({
          sourceQuantityBnb: input.sourceQuantityBnb,
        }),
    );
    if (
      preliminaryQuote.status !== 'quote_available' ||
      preliminaryQuote.quote === null ||
      preliminaryQuote.remainingQuantityBnb === null ||
      preliminaryQuote.walletAddress === null
    ) {
      throw new FundingConversionSubmissionBlockedError(
        'fresh_quote_unavailable',
      );
    }
    const preliminaryWalletAddress = preliminaryQuote.walletAddress;
    const preliminaryProviderQuote = preliminaryQuote.quote;

    const preBalance = await this.loadDependency('pre_conversion_balance', () =>
      this.preBalances.load(preliminaryWalletAddress),
    );
    if (
      preBalance.walletAddress !== preliminaryWalletAddress.toLowerCase() ||
      !new Decimal(preBalance.bnbBalance).equals(
        preliminaryQuote.walletBalanceBnb ?? '-1',
      )
    ) {
      throw new FundingConversionSubmissionBlockedError(
        'pre_conversion_balance_diverged_from_fresh_quote',
      );
    }
    const maximumSlippagePercent = new Decimal(
      preliminaryProviderQuote.maximumSlippageRate,
    )
      .times(100)
      .toFixed();
    const fees = await this.loadDependency('fee_evidence', () =>
      this.feeEvidence.load({
        sourceQuantityBnb: preliminaryProviderQuote.sourceQuantityBnb,
        maximumSlippagePercent,
      }),
    );

    // Network and CLI evidence collection can legitimately outlive the
    // provider quote TTL. Re-quote immediately before the durable claim so
    // the claimed execution bounds are current when provider access begins.
    const quote = await this.loadDependency('final_quote', () =>
      this.quotes.load({
        sourceQuantityBnb: input.sourceQuantityBnb,
      }),
    );
    if (
      quote.status !== 'quote_available' ||
      quote.quote === null ||
      quote.remainingQuantityBnb === null ||
      quote.walletAddress === null
    ) {
      throw new FundingConversionSubmissionBlockedError(
        'fresh_quote_unavailable',
      );
    }
    const freshMaximumSlippagePercent = new Decimal(
      quote.quote.maximumSlippageRate,
    )
      .times(100)
      .toFixed();
    if (
      quote.walletAddress.toLowerCase() !== preBalance.walletAddress ||
      !new Decimal(quote.walletBalanceBnb ?? '-1').equals(preBalance.bnbBalance)
    ) {
      throw new FundingConversionSubmissionBlockedError(
        'pre_conversion_balance_diverged_from_fresh_quote',
      );
    }
    if (
      fees.scope !== 'agentic_wallet_funding_conversion_fee_evidence' ||
      fees.provider !== 'agentic_wallet' ||
      fees.chainId !== '56' ||
      fees.providerFeeRate !== '0' ||
      fees.providerFeeUsd !== '0' ||
      fees.sourceQuantityBnb !== quote.quote.sourceQuantityBnb ||
      fees.maximumSlippagePercent !== freshMaximumSlippagePercent ||
      !new Decimal(fees.expectedUsdt).greaterThanOrEqualTo(
        quote.quote.minimumUsdt,
      )
    )
      throw new FundingConversionSubmissionBlockedError(
        'provider_fee_classification_not_approved',
      );
    const startedAt = this.now();
    if (startedAt.getTime() >= quote.quote.expiresAt.getTime()) {
      throw new FundingConversionSubmissionBlockedError('fresh_quote_expired');
    }
    this.assertRuntimeReady();
    this.assertEmergencyStopInactive();

    const claimed = await this.attempts.claim({
      id: this.newId(),
      planId: input.planId,
      planFingerprint: input.planFingerprint,
      confirmationPhrase: input.confirmationPhrase,
      freshSourceQuantityBnb: quote.quote.sourceQuantityBnb,
      freshExpectedUsdt: quote.quote.expectedUsdt,
      freshMinimumUsdt: quote.quote.minimumUsdt,
      freshMaximumSlippagePercent,
      freshRemainingQuantityBnb: quote.remainingQuantityBnb,
      preConversionWalletAddress: preBalance.walletAddress,
      preConversionBalanceBlockNumber: preBalance.blockNumber,
      preConversionBnbBalance: preBalance.bnbBalance,
      preConversionUsdtBalance: preBalance.usdtBalance,
      preConversionBalanceObservedAt: preBalance.observedAt,
      providerFeeRate: fees.providerFeeRate,
      providerFeeUsd: fees.providerFeeUsd,
      estimatedNetworkFeeUsd: fees.estimatedNetworkFeeUsd,
      feeEvidenceGasMode: fees.gasMode,
      feeEvidenceObservedAt: fees.observedAt,
      startedAt,
    });
    if (claimed.replayed) {
      throw new FundingConversionSubmissionBlockedError(
        'plan_already_consumed',
      );
    }

    let response: unknown;
    try {
      response = await this.runner.run({
        kind: 'funding_conversion_market_order_swap',
        chainId: '56',
        sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS,
        targetTokenAddress: BSC_USDT_ADDRESS,
        sourceQuantityBnb: claimed.attempt.freshSourceQuantityBnb,
        maximumSlippagePercent: claimed.attempt.freshMaximumSlippagePercent,
        mevProtection: true,
        gasLevel: 'MEDIUM',
      });
    } catch {
      response = undefined;
    }

    const outcome = assessAgenticWalletFundingConversionSubmissionResponse(
      claimed.attempt.id,
      response,
    );
    return this.outcomes.record({ outcome, completedAt: this.now() });
  }

  private assertRuntimeReady(): void {
    const ready =
      this.config.get('TRADING_MODE', { infer: true }) === 'real' &&
      this.config.get('REAL_EXECUTION_ENABLED', { infer: true }) === true &&
      this.config.get('REAL_EXECUTION_APPROVED_PROVIDER_ID', {
        infer: true,
      }) === 'agentic_wallet' &&
      this.config.get('REAL_EXECUTION_APPROVED_CHAIN_ID', { infer: true }) ===
        '56' &&
      lower(
        this.config.get('REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS', {
          infer: true,
        }),
      ) === BSC_NATIVE_BNB_ADDRESS.toLowerCase() &&
      lower(
        this.config.get('REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS', {
          infer: true,
        }),
      ) === BSC_USDT_ADDRESS.toLowerCase() &&
      this.config.get('FUNDING_CONVERSION_MIN_GAS_RESERVE_BNB', {
        infer: true,
      }) !== null;
    if (!ready) {
      throw new FundingConversionSubmissionBlockedError(
        'runtime_configuration_not_ready',
      );
    }
  }

  private assertEmergencyStopInactive(): void {
    if (this.emergencyStop.isActive()) {
      throw new FundingConversionSubmissionBlockedError(
        'emergency_stop_active',
      );
    }
  }

  private async loadDependency<T>(
    stage: FundingConversionSubmissionDependencyStage,
    load: () => Promise<T>,
  ): Promise<T> {
    try {
      return await load();
    } catch {
      throw new FundingConversionSubmissionDependencyUnavailableError(stage);
    }
  }
}

function parseRequest(value: unknown): FundingConversionSubmissionRequest {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !==
      'confirmationPhrase,planFingerprint,planId,sourceQuantityBnb' ||
    !('planId' in value) ||
    typeof value.planId !== 'string' ||
    !UUID_PATTERN.test(value.planId) ||
    !('planFingerprint' in value) ||
    typeof value.planFingerprint !== 'string' ||
    !HASH_PATTERN.test(value.planFingerprint) ||
    !('confirmationPhrase' in value) ||
    typeof value.confirmationPhrase !== 'string' ||
    value.confirmationPhrase.length < 1 ||
    value.confirmationPhrase.length > 512 ||
    !('sourceQuantityBnb' in value) ||
    typeof value.sourceQuantityBnb !== 'string' ||
    !POSITIVE_DECIMAL_PATTERN.test(value.sourceQuantityBnb)
  ) {
    throw new InvalidFundingConversionSubmissionRequestError();
  }
  return {
    planId: value.planId,
    planFingerprint: value.planFingerprint,
    confirmationPhrase: value.confirmationPhrase,
    sourceQuantityBnb: new Decimal(value.sourceQuantityBnb).toFixed(),
  };
}

function lower(value: string | null): string | null {
  return value?.toLowerCase() ?? null;
}
