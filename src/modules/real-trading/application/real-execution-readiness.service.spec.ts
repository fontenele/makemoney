import { ConfigService } from '@nestjs/config';
import { RealTradingStatusService } from './real-trading-status.service';
import { RealExecutionReadinessService } from './real-execution-readiness.service';

describe('RealExecutionReadinessService', () => {
  it.each([null, '', '0', '-10', 'NaN'])(
    'blocks missing or invalid daily loss limit %s without claiming enforcement',
    (value) => {
      const status = {
        getLocalStatus: () => ({ localRiskLimits: { status: 'defined' } }),
      } as unknown as RealTradingStatusService;
      const result = new RealExecutionReadinessService(
        new ConfigService({ REAL_RISK_MAX_DAILY_LOSS_USDT: value }),
        status,
        { isActive: () => false },
      ).assess();
      expect(result.maximumDailyLossUsdt).toBeNull();
      expect(result.configurationBlockers).toContain(
        'daily_loss_limit_unconfigured',
      );
      expect(result.integrationBlockers).toContain(
        'verified_daily_loss_accounting_required',
      );
      expect(result.dailyLossEnforcementAvailable).toBe(false);
      expect(result.submissionAuthorized).toBe(false);
    },
  );
  it.each([false, true])(
    'keeps integration blockers even with all gates enabled=%s',
    (enabled) => {
      const config = new ConfigService({
        RISK_CONTROL_TOKEN_SHA256: enabled ? 'a'.repeat(64) : '',
        REAL_RISK_MAX_DAILY_LOSS_USDT: '10',
        REAL_AUTONOMOUS_PROTECTIVE_EXITS_ALLOWED: enabled,
      });
      const status = {
        getLocalStatus: () => ({
          tradingMode: enabled ? 'real' : 'paper',
          realExecutionEnabled: enabled,
          operatorSubmissionEnabled: enabled,
          localRiskLimits: { status: 'defined' },
        }),
      } as unknown as RealTradingStatusService;
      const result = new RealExecutionReadinessService(config, status, {
        isActive: () => false,
      }).assess();
      expect(result).toMatchObject({
        status: 'blocked',
        providerAccessPerformed: false,
        submissionAuthorized: false,
        authenticatedReservationRuntimeAvailable: false,
        providerGasCapAvailable: false,
        providerBoundedApprovalVerified: false,
        selectedApprovalPolicy:
          'provider_managed_approval_with_targeted_revocation',
        approvalCleanupRuntimeAvailable: false,
        providerApprovalPolicyReviewRequired: false,
        providerCostPolicyReviewRequired: false,
        selectedCostPolicy: 'estimated_net_profit_after_costs',
        signerAccountAccessAuthorized: false,
        maximumDailyLossUsdt: '10',
        dailyLossEnforcementAvailable: false,
        protectiveExitsAuthorized: enabled,
      });
      expect(result.integrationBlockers).toContain(
        'durable_approval_cleanup_runtime_required',
      );
      expect(result.operatorAuthenticationConfigured).toBe(enabled);
      expect(result.integrationBlockers).toHaveLength(9);
      expect(result.integrationBlockers).toContain(
        'estimated_net_profit_runtime_composition_required',
      );
      expect(JSON.stringify(result)).not.toContain('a'.repeat(64));
      expect(result.configurationBlockers.length).toBe(enabled ? 0 : 4);
    },
  );
  it('reports emergency stop independently', () => {
    const status = {
      getLocalStatus: () => ({ localRiskLimits: { status: 'blocked' } }),
    } as unknown as RealTradingStatusService;
    expect(
      new RealExecutionReadinessService(new ConfigService(), status, {
        isActive: () => true,
      }).assess().configurationBlockers,
    ).toContain('emergency_stop_active');
  });
});
