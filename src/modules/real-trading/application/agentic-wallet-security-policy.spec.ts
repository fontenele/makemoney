import { assessAgenticWalletSecurity } from './agentic-wallet-security-policy';
import {
  AgenticWalletQuota,
  AgenticWalletSecuritySettings,
} from '../infrastructure/agentic-wallet-capability.adapter';

const NOW = new Date('2026-10-01T12:00:00.000Z');

describe('assessAgenticWalletSecurity', () => {
  it('accepts only a restrictive posture without authorizing funding or execution', () => {
    expect(assessAgenticWalletSecurity(settings(), quota(), NOW)).toEqual({
      scope: 'agentic_wallet_security_posture',
      status: 'restrictive',
      blockers: [],
      providerDailyLimitAcceptedAsProjectRiskLimit: false,
      independentProjectLimitsRequired: true,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
      evaluatedAt: NOW,
    });
  });

  it('reports every unsafe provider toggle independently', () => {
    expect(
      assessAgenticWalletSecurity(
        settings({
          abnormalTransactionHandling: 'NeedConfirmation',
          tradeAllTokens: true,
          predictionTradingEnabled: true,
          developerModeEnabled: true,
        }),
        quota(),
        NOW,
      ),
    ).toMatchObject({
      status: 'blocked',
      blockers: [
        'abnormal_transactions_not_auto_rejected',
        'token_scope_unrestricted',
        'prediction_trading_enabled',
        'developer_mode_enabled',
      ],
    });
  });

  it('blocks missing, expired, and malformed observations', () => {
    expect(assessAgenticWalletSecurity(null, null, NOW).blockers).toEqual([
      'settings_unavailable',
      'quota_unavailable',
    ]);
    expect(
      assessAgenticWalletSecurity(
        settings({ sessionExpiresAt: new Date(NOW) }),
        quota(),
        NOW,
      ).blockers,
    ).toContain('session_expired');
    expect(
      assessAgenticWalletSecurity(
        settings({ dailyLimitUsd: '01' }),
        quota(),
        NOW,
      ).blockers,
    ).toContain('invalid_settings');
    expect(
      assessAgenticWalletSecurity(
        settings(),
        quota({ date: '2026-02-30' }),
        NOW,
      ).blockers,
    ).toContain('invalid_quota');
  });

  it('requires exact quota reconciliation against the provider limit', () => {
    expect(
      assessAgenticWalletSecurity(
        settings(),
        quota({ usedUsd: '1001', remainingUsd: '0' }),
        NOW,
      ).blockers,
    ).toEqual(['quota_exceeds_daily_limit', 'quota_total_mismatch']);
    expect(
      assessAgenticWalletSecurity(
        settings(),
        quota({ usedUsd: '1', remainingUsd: '998' }),
        NOW,
      ).blockers,
    ).toEqual(['quota_total_mismatch']);
  });

  it('rejects an invalid evaluation time', () => {
    expect(() =>
      assessAgenticWalletSecurity(settings(), quota(), new Date('invalid')),
    ).toThrow('Agentic Wallet security evaluation time must be valid');
  });
});

function settings(
  overrides: Partial<AgenticWalletSecuritySettings> = {},
): AgenticWalletSecuritySettings {
  return {
    dailyLimitUsd: '1000',
    abnormalTransactionHandling: 'AutoReject',
    tradeAllTokens: false,
    predictionTradingEnabled: false,
    developerModeEnabled: false,
    sessionExpiresAt: new Date('2026-10-03T12:00:00.000Z'),
    signInMaximumAt: new Date('2027-10-01T12:00:00.000Z'),
    inactivitySignOutAt: new Date('2026-10-03T12:00:00.000Z'),
    ...overrides,
  };
}

function quota(
  overrides: Partial<AgenticWalletQuota> = {},
): AgenticWalletQuota {
  return {
    usedUsd: '0',
    remainingUsd: '1000',
    date: '2026-10-01',
    ...overrides,
  };
}
