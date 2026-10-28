import { isDeepStrictEqual } from 'node:util';

import Decimal from 'decimal.js';

import {
  RealExecutionIntent,
  RealExecutionQuote,
  validateRealExecutionIntent,
  validateRealExecutionQuote,
} from '../domain/real-execution';
import { AgenticWalletCapabilityObservation } from '../infrastructure/agentic-wallet-capability.adapter';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import { RealExecutionProviderQuotaSnapshot } from './real-execution-provider-quota-risk';

const ExactDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const NON_NEGATIVE_DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d+)?|0\.\d*[1-9]\d*)$/;
const UTC_DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type AgenticWalletProviderQuotaSnapshotBlocker =
  | 'invalid_wallet_capability_observation'
  | 'wallet_not_connected'
  | 'approved_chain_unavailable'
  | 'quota_read_unavailable'
  | 'security_settings_unavailable'
  | 'provider_quota_unavailable'
  | 'invalid_security_settings'
  | 'invalid_provider_quota'
  | 'invalid_real_execution_intent'
  | 'invalid_real_execution_quote'
  | 'quote_intent_mismatch'
  | 'quote_provider_mismatch'
  | 'instrument_not_approved'
  | 'invalid_required_usd'
  | 'invalid_requirement_valued_at';

export interface AgenticWalletProviderQuotaSnapshotAssessment {
  readonly scope: 'agentic_wallet_provider_quota_snapshot_assessment';
  readonly status: 'provider_quota_snapshot_ready' | 'blocked';
  readonly blockers: readonly AgenticWalletProviderQuotaSnapshotBlocker[];
  readonly quotaSnapshot: RealExecutionProviderQuotaSnapshot | null;
  readonly providerObservationValidated: boolean;
  readonly requirementValuationExternallySupplied: boolean;
  readonly providerDailyLimitAcceptedAsProjectRiskLimit: false;
  readonly durableQuotaReservation: false;
  readonly riskApproved: false;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

export function prepareAgenticWalletProviderQuotaSnapshot(
  observation: AgenticWalletCapabilityObservation,
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
  requiredUsd: string,
  requirementValuedAt: Date,
): AgenticWalletProviderQuotaSnapshotAssessment {
  const blockers: AgenticWalletProviderQuotaSnapshotBlocker[] = [];
  const observationValid = validObservation(observation);
  addIf(blockers, !observationValid, 'invalid_wallet_capability_observation');
  if (observationValid) {
    addIf(
      blockers,
      !observation.capabilities.connected,
      'wallet_not_connected',
    );
    addIf(
      blockers,
      !observation.capabilities.chains.some((chain) => chain.chainId === '56'),
      'approved_chain_unavailable',
    );
    addIf(
      blockers,
      !observation.capabilities.reads.quota,
      'quota_read_unavailable',
    );
    addIf(
      blockers,
      observation.settings === null,
      'security_settings_unavailable',
    );
    addIf(blockers, observation.quota === null, 'provider_quota_unavailable');
    addIf(
      blockers,
      observation.settings !== null && !validSettings(observation.settings),
      'invalid_security_settings',
    );
    addIf(
      blockers,
      observation.quota !== null && !validQuota(observation.quota),
      'invalid_provider_quota',
    );
  }

  const intentValid = validIntent(intent);
  addIf(blockers, !intentValid, 'invalid_real_execution_intent');
  const quoteValid = validQuote(quote);
  addIf(blockers, !quoteValid, 'invalid_real_execution_quote');
  addIf(
    blockers,
    intentValid && quoteValid && !isDeepStrictEqual(quote.intent, intent),
    'quote_intent_mismatch',
  );
  addIf(
    blockers,
    quoteValid && quote.providerId !== 'agentic_wallet',
    'quote_provider_mismatch',
  );
  addIf(
    blockers,
    intentValid && !approvedIntent(intent),
    'instrument_not_approved',
  );
  const requiredUsdValid =
    typeof requiredUsd === 'string' &&
    POSITIVE_DECIMAL_PATTERN.test(requiredUsd);
  addIf(blockers, !requiredUsdValid, 'invalid_required_usd');
  const requirementValuedAtValid =
    requirementValuedAt instanceof Date &&
    Number.isFinite(requirementValuedAt.getTime());
  addIf(blockers, !requirementValuedAtValid, 'invalid_requirement_valued_at');

  if (
    blockers.length > 0 ||
    !observationValid ||
    observation.settings === null ||
    observation.quota === null ||
    !intentValid ||
    !quoteValid ||
    !requiredUsdValid ||
    !requirementValuedAtValid
  ) {
    return assessment(blockers, null, observationValid, false);
  }

  return assessment(
    blockers,
    {
      providerId: 'agentic_wallet',
      chainId: '56',
      intentId: intent.id,
      quoteId: quote.id,
      utcDay: observation.quota.date,
      dailyLimitUsd: new ExactDecimal(
        observation.settings.dailyLimitUsd,
      ).toFixed(),
      usedUsd: new ExactDecimal(observation.quota.usedUsd).toFixed(),
      remainingUsd: new ExactDecimal(observation.quota.remainingUsd).toFixed(),
      quotaCoverage: 'complete',
      requiredUsd: new ExactDecimal(requiredUsd).toFixed(),
      requirementValuationBasis: 'explicit_external_usd_value',
      requirementCoverage: 'complete',
      quotaObservedAt: new Date(observation.capabilities.observedAt),
      requirementValuedAt: new Date(requirementValuedAt),
    },
    true,
    true,
  );
}

function validObservation(
  value: unknown,
): value is AgenticWalletCapabilityObservation {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    return false;
  const observation = value as Record<string, unknown>;
  if (
    observation.cliVersion !== '1.10.0' ||
    observation.requiredCliVersion !== '1.10.0'
  )
    return false;
  const capabilities = observation.capabilities;
  if (
    typeof capabilities !== 'object' ||
    capabilities === null ||
    Array.isArray(capabilities)
  )
    return false;
  const capability = capabilities as Record<string, unknown>;
  const chains = capability.chains;
  const reads = capability.reads;
  return (
    capability.providerId === 'agentic_wallet' &&
    typeof capability.connected === 'boolean' &&
    Array.isArray(chains) &&
    chains.length <= 32 &&
    chains.every(
      (chain) =>
        typeof chain === 'object' &&
        chain !== null &&
        !Array.isArray(chain) &&
        typeof (chain as Record<string, unknown>).chainId === 'string' &&
        Array.isArray((chain as Record<string, unknown>).operations),
    ) &&
    typeof reads === 'object' &&
    reads !== null &&
    !Array.isArray(reads) &&
    typeof (reads as Record<string, unknown>).securitySettings === 'boolean' &&
    typeof (reads as Record<string, unknown>).quota === 'boolean' &&
    typeof (reads as Record<string, unknown>).balances === 'boolean' &&
    typeof (reads as Record<string, unknown>).gas === 'boolean' &&
    capability.observedAt instanceof Date &&
    Number.isFinite(capability.observedAt.getTime())
  );
}

function validSettings(
  settings: NonNullable<AgenticWalletCapabilityObservation['settings']>,
): boolean {
  return (
    POSITIVE_DECIMAL_PATTERN.test(settings.dailyLimitUsd) &&
    (settings.abnormalTransactionHandling === 'AutoReject' ||
      settings.abnormalTransactionHandling === 'NeedConfirmation') &&
    typeof settings.tradeAllTokens === 'boolean' &&
    typeof settings.predictionTradingEnabled === 'boolean' &&
    typeof settings.developerModeEnabled === 'boolean' &&
    validDate(settings.sessionExpiresAt) &&
    validDate(settings.signInMaximumAt) &&
    validDate(settings.inactivitySignOutAt)
  );
}

function validQuota(
  quota: NonNullable<AgenticWalletCapabilityObservation['quota']>,
): boolean {
  if (
    !NON_NEGATIVE_DECIMAL_PATTERN.test(quota.usedUsd) ||
    !NON_NEGATIVE_DECIMAL_PATTERN.test(quota.remainingUsd) ||
    !UTC_DAY_PATTERN.test(quota.date)
  )
    return false;
  const parsed = new Date(`${quota.date}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && utcDay(parsed) === quota.date;
}

function validIntent(intent: RealExecutionIntent): boolean {
  try {
    validateRealExecutionIntent(intent);
    return true;
  } catch {
    return false;
  }
}

function validQuote(quote: RealExecutionQuote): boolean {
  try {
    validateRealExecutionQuote(quote);
    return true;
  } catch {
    return false;
  }
}

function approvedIntent(intent: RealExecutionIntent): boolean {
  const approved = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  const source = intent.sourceAsset.tokenAddress.toLowerCase();
  const target = intent.targetAsset.tokenAddress.toLowerCase();
  const usdt = approved.usdt.tokenAddress.toLowerCase();
  const btcb = approved.btc.tokenAddress.toLowerCase();
  return (
    intent.chainId === approved.chainId &&
    ((source === usdt &&
      intent.sourceAsset.symbol === 'USDT' &&
      target === btcb &&
      intent.targetAsset.symbol === 'BTCB') ||
      (source === btcb &&
        intent.sourceAsset.symbol === 'BTCB' &&
        target === usdt &&
        intent.targetAsset.symbol === 'USDT'))
  );
}

function validDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function utcDay(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function assessment(
  blockers: readonly AgenticWalletProviderQuotaSnapshotBlocker[],
  quotaSnapshot: RealExecutionProviderQuotaSnapshot | null,
  providerObservationValidated: boolean,
  requirementValuationExternallySupplied: boolean,
): AgenticWalletProviderQuotaSnapshotAssessment {
  return {
    scope: 'agentic_wallet_provider_quota_snapshot_assessment',
    status:
      quotaSnapshot === null ? 'blocked' : 'provider_quota_snapshot_ready',
    blockers: [...blockers],
    quotaSnapshot:
      quotaSnapshot === null
        ? null
        : {
            ...quotaSnapshot,
            quotaObservedAt: new Date(quotaSnapshot.quotaObservedAt),
            requirementValuedAt: new Date(quotaSnapshot.requirementValuedAt),
          },
    providerObservationValidated,
    requirementValuationExternallySupplied,
    providerDailyLimitAcceptedAsProjectRiskLimit: false,
    durableQuotaReservation: false,
    riskApproved: false,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
  };
}

function addIf(
  blockers: AgenticWalletProviderQuotaSnapshotBlocker[],
  condition: boolean,
  blocker: AgenticWalletProviderQuotaSnapshotBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
