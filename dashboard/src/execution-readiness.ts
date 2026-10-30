import { dashboardApiPath } from './api';

export interface ExecutionReadiness {
  operatorAuthenticationConfigured: boolean;
  emergencyStopActive: boolean;
  configurationBlockers: string[];
  integrationBlockers: string[];
  quotePreviewImplemented: boolean;
  feeEstimatePreviewImplemented: boolean;
  operatorSubmissionBoundaryImplemented: boolean;
  authenticatedReservationRuntimeAvailable: boolean;
  strategyExecutionAvailable: boolean;
  providerGasCapAvailable: boolean;
  providerBoundedApprovalVerified: boolean;
  providerApprovalPolicyReviewRequired: boolean;
  selectedApprovalPolicy: 'provider_managed_approval_with_targeted_revocation';
  approvalCleanupRuntimeAvailable: boolean;
  providerCostPolicyReviewRequired: boolean;
  selectedCostPolicy: 'estimated_net_profit_after_costs';
  signerAccountAccessAuthorized: boolean;
  maximumDailyLossUsdt: string | null;
  dailyLossEnforcementAvailable: boolean;
  protectiveExitsAuthorized: boolean;
}

export const executionBlockerLabel = (blocker: string): string =>
  ({
    durable_approval_cleanup_runtime_required:
      'Provider-managed approvals with targeted revocation were selected; durable cleanup and monitoring are not connected',
    daily_loss_limit_unconfigured: 'The daily loss limit needs configuration',
    verified_daily_loss_accounting_required:
      'Daily loss accounting and enforcement are not connected',
    validated_strategy_return_model_required:
      'A validated strategy return model is required; a buy signal alone does not establish profit',
    operator_authentication_unconfigured:
      'Operator authentication needs configuration',
    real_mode_disabled: 'Application is in paper mode',
    real_execution_disabled: 'Real execution is disabled',
    operator_submission_disabled: 'Manual order submission is disabled',
    local_risk_limits_blocked: 'Local risk limits need review',
    emergency_stop_active: 'Emergency stop is active',
    provider_gas_cost_policy_review_required:
      'Provider cannot enforce a gas-cost ceiling; operator policy review is required',
    signer_account_access_authorization_required:
      'Permission is required before adding wallet-account access for a compatible signer',
    fee_bounded_signer_connection_required:
      'A compatible signer must be connected and its fee-bound capability verified',
    estimated_net_profit_runtime_composition_required:
      'Expected net profitability screening is not connected to execution',
    exact_market_fee_debit_evidence_required:
      'Exact trading-fee debit is not verified',
    reliable_buffered_gas_estimate_required:
      'Reliable fresh gas estimates with a safety margin are required',
    authenticated_reservation_runtime_composition_required:
      'Authenticated capacity reservation is not connected',
    reservation_to_operational_risk_gate_composition_required:
      'Reservation and operational risk checks are not connected',
    complete_path_acceptance_required:
      'Complete execution-path verification is pending',
  })[blocker] ?? 'An additional prerequisite needs review';

export async function loadExecutionReadiness(
  request: typeof fetch = fetch,
): Promise<ExecutionReadiness | null> {
  try {
    const response = await request(
      dashboardApiPath('/real-trading/execution-readiness'),
      { headers: { Accept: 'application/json' } },
    );
    if (!response.ok) return null;
    const data: unknown = await response.json();
    if (typeof data !== 'object' || data === null) return null;
    const candidate = data as Record<string, unknown>;
    const booleans = [
      'operatorAuthenticationConfigured',
      'emergencyStopActive',
      'quotePreviewImplemented',
      'feeEstimatePreviewImplemented',
      'operatorSubmissionBoundaryImplemented',
      'authenticatedReservationRuntimeAvailable',
      'strategyExecutionAvailable',
      'providerGasCapAvailable',
      'providerBoundedApprovalVerified',
      'providerApprovalPolicyReviewRequired',
      'approvalCleanupRuntimeAvailable',
      'providerCostPolicyReviewRequired',
      'signerAccountAccessAuthorized',
      'dailyLossEnforcementAvailable',
      'protectiveExitsAuthorized',
    ];
    if (booleans.some((key) => typeof candidate[key] !== 'boolean'))
      return null;
    if (
      candidate.maximumDailyLossUsdt !== null &&
      (typeof candidate.maximumDailyLossUsdt !== 'string' ||
        !/^(?:[1-9]\d{0,19}(?:\.\d{1,18})?|0\.(?=\d{0,17}[1-9])\d{1,18})$/.test(
          candidate.maximumDailyLossUsdt,
        ))
    )
      return null;
    if (
      candidate.selectedApprovalPolicy !==
      'provider_managed_approval_with_targeted_revocation'
    )
      return null;
    if (candidate.selectedCostPolicy !== 'estimated_net_profit_after_costs')
      return null;
    if (
      ['configurationBlockers', 'integrationBlockers'].some(
        (key) =>
          !Array.isArray(candidate[key]) ||
          candidate[key].length > 20 ||
          candidate[key].some(
            (value: unknown) => typeof value !== 'string' || value.length > 128,
          ),
      )
    )
      return null;
    return candidate as unknown as ExecutionReadiness;
  } catch {
    return null;
  }
}
