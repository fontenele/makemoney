import Decimal from 'decimal.js';
import {
  AgenticWalletQuota,
  AgenticWalletSecuritySettings,
} from '../infrastructure/agentic-wallet-capability.adapter';

const ExactDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type AgenticWalletSecurityBlocker =
  | 'settings_unavailable'
  | 'quota_unavailable'
  | 'invalid_settings'
  | 'invalid_quota'
  | 'session_expired'
  | 'abnormal_transactions_not_auto_rejected'
  | 'token_scope_unrestricted'
  | 'prediction_trading_enabled'
  | 'developer_mode_enabled'
  | 'quota_exceeds_daily_limit'
  | 'quota_total_mismatch';

export interface AgenticWalletSecurityAssessment {
  readonly scope: 'agentic_wallet_security_posture';
  readonly status: 'restrictive' | 'blocked';
  readonly blockers: readonly AgenticWalletSecurityBlocker[];
  readonly providerDailyLimitAcceptedAsProjectRiskLimit: false;
  readonly independentProjectLimitsRequired: true;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function assessAgenticWalletSecurity(
  settings: AgenticWalletSecuritySettings | null,
  quota: AgenticWalletQuota | null,
  evaluatedAt: Date,
): AgenticWalletSecurityAssessment {
  validateEvaluationTime(evaluatedAt);
  const blockers: AgenticWalletSecurityBlocker[] = [];

  if (settings === null) {
    blockers.push('settings_unavailable');
  } else if (!validSettings(settings)) {
    blockers.push('invalid_settings');
  } else {
    addIf(
      blockers,
      settings.sessionExpiresAt.getTime() <= evaluatedAt.getTime(),
      'session_expired',
    );
    addIf(
      blockers,
      settings.abnormalTransactionHandling !== 'AutoReject',
      'abnormal_transactions_not_auto_rejected',
    );
    addIf(blockers, settings.tradeAllTokens, 'token_scope_unrestricted');
    addIf(
      blockers,
      settings.predictionTradingEnabled,
      'prediction_trading_enabled',
    );
    addIf(blockers, settings.developerModeEnabled, 'developer_mode_enabled');
  }

  if (quota === null) {
    blockers.push('quota_unavailable');
  } else if (!validQuota(quota)) {
    blockers.push('invalid_quota');
  } else if (settings !== null && validSettings(settings)) {
    const dailyLimit = new ExactDecimal(settings.dailyLimitUsd);
    const used = new ExactDecimal(quota.usedUsd);
    const remaining = new ExactDecimal(quota.remainingUsd);
    addIf(blockers, used.greaterThan(dailyLimit), 'quota_exceeds_daily_limit');
    addIf(
      blockers,
      !used.plus(remaining).equals(dailyLimit),
      'quota_total_mismatch',
    );
  }

  return {
    scope: 'agentic_wallet_security_posture',
    status: blockers.length === 0 ? 'restrictive' : 'blocked',
    blockers,
    providerDailyLimitAcceptedAsProjectRiskLimit: false,
    independentProjectLimitsRequired: true,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function validSettings(settings: AgenticWalletSecuritySettings): boolean {
  return (
    validDecimal(settings.dailyLimitUsd) &&
    (settings.abnormalTransactionHandling === 'AutoReject' ||
      settings.abnormalTransactionHandling === 'NeedConfirmation') &&
    typeof settings.tradeAllTokens === 'boolean' &&
    typeof settings.predictionTradingEnabled === 'boolean' &&
    typeof settings.developerModeEnabled === 'boolean' &&
    settings.sessionExpiresAt instanceof Date &&
    Number.isFinite(settings.sessionExpiresAt.getTime())
  );
}

function validQuota(quota: AgenticWalletQuota): boolean {
  if (
    !validDecimal(quota.usedUsd) ||
    !validDecimal(quota.remainingUsd) ||
    !DATE_PATTERN.test(quota.date)
  ) {
    return false;
  }
  const date = new Date(`${quota.date}T00:00:00.000Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().startsWith(quota.date)
  );
}

function validDecimal(value: string): boolean {
  return typeof value === 'string' && DECIMAL_PATTERN.test(value);
}

function validateEvaluationTime(value: Date): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error('Agentic Wallet security evaluation time must be valid');
  }
}

function addIf(
  blockers: AgenticWalletSecurityBlocker[],
  condition: boolean,
  blocker: AgenticWalletSecurityBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
