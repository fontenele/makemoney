import { ConfigService } from '@nestjs/config';
import { RealTradingStatusService } from './real-trading-status.service';
import { EmergencyStopService } from '../../risk-engine/application/emergency-stop.service';

/** Provider-free operator diagnostics; configuration alone never implies readiness. */
export class RealExecutionReadinessService {
  constructor(
    private readonly config: Pick<ConfigService, 'get'>,
    private readonly status: Pick<RealTradingStatusService, 'getLocalStatus'>,
    private readonly stop: Pick<EmergencyStopService, 'isActive'>,
  ) {}

  assess() {
    const local = this.status.getLocalStatus();
    const digest = this.config.get<string>('RISK_CONTROL_TOKEN_SHA256');
    const operatorAuthenticationConfigured =
      typeof digest === 'string' && /^[a-f0-9]{64}$/.test(digest);
    const emergencyStopActive = this.stop.isActive();
    const dailyLoss = this.config.get<string>('REAL_RISK_MAX_DAILY_LOSS_USDT');
    const maximumDailyLossUsdt =
      typeof dailyLoss === 'string' &&
      /^(?:[1-9]\d{0,19}(?:\.\d{1,18})?|0\.(?=\d{0,17}[1-9])\d{1,18})$/.test(
        dailyLoss,
      )
        ? dailyLoss
        : null;
    const configurationBlockers: string[] = [];
    if (maximumDailyLossUsdt === null)
      configurationBlockers.push('daily_loss_limit_unconfigured');
    if (!operatorAuthenticationConfigured)
      configurationBlockers.push('operator_authentication_unconfigured');
    if (local.tradingMode !== 'real')
      configurationBlockers.push('real_mode_disabled');
    if (!local.realExecutionEnabled)
      configurationBlockers.push('real_execution_disabled');
    if (!local.operatorSubmissionEnabled)
      configurationBlockers.push('operator_submission_disabled');
    if (local.localRiskLimits.status !== 'defined')
      configurationBlockers.push('local_risk_limits_blocked');
    if (emergencyStopActive)
      configurationBlockers.push('emergency_stop_active');
    return {
      scope: 'real_execution_operator_readiness' as const,
      status: 'blocked' as const,
      operatorAuthenticationConfigured,
      emergencyStopActive,
      maximumDailyLossUsdt,
      dailyLossEnforcementAvailable: false,
      protectiveExitsAuthorized:
        this.config.get<boolean>('REAL_AUTONOMOUS_PROTECTIVE_EXITS_ALLOWED') ===
        true,
      configurationBlockers,
      integrationBlockers: [
        'durable_approval_cleanup_runtime_required',
        'verified_daily_loss_accounting_required',
        'validated_strategy_return_model_required',
        'estimated_net_profit_runtime_composition_required',
        'exact_market_fee_debit_evidence_required',
        'reliable_buffered_gas_estimate_required',
        'authenticated_reservation_runtime_composition_required',
        'reservation_to_operational_risk_gate_composition_required',
        'complete_path_acceptance_required',
      ],
      quotePreviewImplemented: true,
      feeEstimatePreviewImplemented: true,
      providerGasCapAvailable: false,
      providerBoundedApprovalVerified: false,
      selectedApprovalPolicy:
        'provider_managed_approval_with_targeted_revocation',
      approvalCleanupRuntimeAvailable: false,
      providerApprovalPolicyReviewRequired: false,
      providerCostPolicyReviewRequired: false,
      selectedCostPolicy: 'estimated_net_profit_after_costs' as const,
      signerAccountAccessAuthorized: false,
      operatorSubmissionBoundaryImplemented: true,
      authenticatedReservationRuntimeAvailable: false,
      strategyExecutionAvailable: false,
      liveWalletObserved: false,
      providerAccessPerformed: false,
      riskApproved: false,
      submissionAuthorized: false,
      evaluatedAt: new Date(),
    };
  }
}
