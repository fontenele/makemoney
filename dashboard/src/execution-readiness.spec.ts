import { describe, expect, it, vi } from 'vitest';
import {
  executionBlockerLabel,
  loadExecutionReadiness,
} from './execution-readiness';

const response = () => ({
  operatorAuthenticationConfigured: false,
  emergencyStopActive: false,
  configurationBlockers: ['operator_authentication_unconfigured'],
  integrationBlockers: ['reliable_buffered_gas_estimate_required'],
  quotePreviewImplemented: true,
  feeEstimatePreviewImplemented: true,
  operatorSubmissionBoundaryImplemented: true,
  authenticatedReservationRuntimeAvailable: false,
  strategyExecutionAvailable: false,
  providerGasCapAvailable: false,
  providerBoundedApprovalVerified: false,
  providerApprovalPolicyReviewRequired: false,
  selectedApprovalPolicy: 'provider_managed_approval_with_targeted_revocation',
  approvalCleanupRuntimeAvailable: false,
  providerCostPolicyReviewRequired: false,
  selectedCostPolicy: 'estimated_net_profit_after_costs',
  signerAccountAccessAuthorized: false,
  maximumDailyLossUsdt: '10',
  dailyLossEnforcementAvailable: false,
  protectiveExitsAuthorized: true,
});
describe('execution readiness display', () => {
  it('uses the read-only proxy path without authorization or a mutation body', async () => {
    const request = vi.fn(() => Promise.resolve(Response.json(response())));
    await expect(loadExecutionReadiness(request)).resolves.toEqual(response());
    expect(request).toHaveBeenCalledWith(
      '/api/real-trading/execution-readiness',
      { headers: { Accept: 'application/json' } },
    );
  });
  it.each([
    {},
    { ...response(), selectedApprovalPolicy: 'unrestricted' },
    { ...response(), approvalCleanupRuntimeAvailable: undefined },
    { ...response(), providerBoundedApprovalVerified: undefined },
    { ...response(), providerApprovalPolicyReviewRequired: 'false' },
    { ...response(), emergencyStopActive: 'false' },
    { ...response(), maximumDailyLossUsdt: 'NaN' },
    { ...response(), maximumDailyLossUsdt: undefined },
    { ...response(), integrationBlockers: Array(21).fill('x') },
  ])('does not infer readiness from malformed evidence', async (value) => {
    await expect(
      loadExecutionReadiness(() => Promise.resolve(Response.json(value))),
    ).resolves.toBeNull();
  });
  it('handles network failure without provider fallback', async () => {
    const request = vi.fn(() => Promise.reject(new Error('offline')));
    await expect(loadExecutionReadiness(request)).resolves.toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('uses a bounded human label for unknown blockers', () => {
    expect(
      executionBlockerLabel('durable_approval_cleanup_runtime_required'),
    ).toContain('durable cleanup');
    expect(executionBlockerLabel('unknown')).toBe(
      'An additional prerequisite needs review',
    );
    expect(executionBlockerLabel('operator_authentication_unconfigured')).toBe(
      'Operator authentication needs configuration',
    );
  });
});
