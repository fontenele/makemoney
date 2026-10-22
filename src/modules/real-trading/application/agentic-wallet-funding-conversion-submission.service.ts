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

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;

interface FundingConversionSubmissionEnvironment {
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

export class AgenticWalletFundingConversionSubmissionService {
  constructor(
    private readonly quotes: AgenticWalletFundingConversionQuoteService,
    private readonly config: ConfigService<
      FundingConversionSubmissionEnvironment,
      true
    >,
    private readonly emergencyStop: EmergencyStopStatus,
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

    const quote = await this.quotes.load({
      sourceQuantityBnb: input.sourceQuantityBnb,
    });
    if (
      quote.status !== 'quote_available' ||
      quote.quote === null ||
      quote.remainingQuantityBnb === null
    ) {
      throw new FundingConversionSubmissionBlockedError(
        'fresh_quote_unavailable',
      );
    }

    const startedAt = this.now();
    if (startedAt.getTime() >= quote.quote.expiresAt.getTime()) {
      throw new FundingConversionSubmissionBlockedError('fresh_quote_expired');
    }
    this.assertRuntimeReady();
    this.assertEmergencyStopInactive();

    const maximumSlippagePercent = new Decimal(quote.quote.maximumSlippageRate)
      .times(100)
      .toFixed();
    const claimed = await this.attempts.claim({
      id: this.newId(),
      planId: input.planId,
      planFingerprint: input.planFingerprint,
      confirmationPhrase: input.confirmationPhrase,
      freshSourceQuantityBnb: quote.quote.sourceQuantityBnb,
      freshExpectedUsdt: quote.quote.expectedUsdt,
      freshMinimumUsdt: quote.quote.minimumUsdt,
      freshMaximumSlippagePercent: maximumSlippagePercent,
      freshRemainingQuantityBnb: quote.remainingQuantityBnb,
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
