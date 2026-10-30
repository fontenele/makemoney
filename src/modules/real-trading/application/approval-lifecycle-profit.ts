import Decimal from 'decimal.js';
import { assessEstimatedNetProfit } from './estimated-net-profit';
const D = Decimal.clone({ precision: 100, toExpNeg: -100, toExpPos: 100 });
export const APPROVAL_LIFECYCLE_GAS_COMPONENTS = [
  'entryApproval',
  'entrySwap',
  'entryRevocation',
  'exitApproval',
  'exitSwap',
  'exitRevocation',
] as const;
export type ApprovalLifecycleGasComponent =
  (typeof APPROVAL_LIFECYCLE_GAS_COMPONENTS)[number];
export interface ApprovalLifecycleProfitInput {
  investmentUsdt: string;
  expectedExitProceedsUsdt: string;
  entryTradingFeeUsdt: string;
  exitTradingFeeUsdt: string;
  gasSafetyMultiplier: string;
  tradingFeeEvidenceComplete: boolean;
  gas: Record<
    ApprovalLifecycleGasComponent,
    { amountUsdt: string; observedAt: Date; evidenceBasis: 'fresh_estimate' }
  >;
  evaluatedAt: Date;
}
/** Conservative ERC20 round-trip screen. Historical receipts cannot replace future estimates. */
export function assessApprovalLifecycleProfit(
  input: ApprovalLifecycleProfitInput,
) {
  const blocked = (reason: string) => ({
    status: 'blocked' as const,
    reason,
    submissionAuthorized: false as const,
    riskApproved: false as const,
  });
  if (input.tradingFeeEvidenceComplete !== true)
    return blocked('complete_trading_fee_evidence_required');
  if (
    !(input.evaluatedAt instanceof Date) ||
    !Number.isFinite(input.evaluatedAt.getTime()) ||
    !input.gas ||
    Object.keys(input.gas).sort().join(',') !==
      [...APPROVAL_LIFECYCLE_GAS_COMPONENTS].sort().join(',')
  )
    return blocked('complete_lifecycle_gas_estimates_required');
  for (const name of APPROVAL_LIFECYCLE_GAS_COMPONENTS) {
    const leg = input.gas[name];
    if (
      !leg ||
      leg.evidenceBasis !== 'fresh_estimate' ||
      typeof leg.amountUsdt !== 'string' ||
      !/^(?:0|[1-9]\d{0,29})(?:\.\d{1,18})?$/.test(leg.amountUsdt) ||
      new D(leg.amountUsdt).lte(0)
    )
      return blocked('positive_fresh_lifecycle_gas_estimates_required');
    if (
      !(leg.observedAt instanceof Date) ||
      !Number.isFinite(leg.observedAt.getTime()) ||
      leg.observedAt > input.evaluatedAt ||
      input.evaluatedAt.getTime() - leg.observedAt.getTime() > 5000
    )
      return blocked('stale_or_invalid_lifecycle_gas_evidence');
  }
  const sum = (names: ApprovalLifecycleGasComponent[]) =>
    names
      .reduce((total, name) => total.plus(input.gas[name].amountUsdt), new D(0))
      .toFixed();
  const entryGasEstimateUsdt = sum([
    'entryApproval',
    'entrySwap',
    'entryRevocation',
  ]);
  const exitGasEstimateUsdt = sum([
    'exitApproval',
    'exitSwap',
    'exitRevocation',
  ]);
  const oldest = APPROVAL_LIFECYCLE_GAS_COMPONENTS.reduce(
    (time, name) => Math.min(time, input.gas[name].observedAt.getTime()),
    input.evaluatedAt.getTime(),
  );
  const assessment = assessEstimatedNetProfit({
    ...input,
    entryGasEstimateUsdt,
    exitGasEstimateUsdt,
    observedAt: new Date(oldest),
  });
  return {
    ...assessment,
    approvalPolicy:
      'provider_managed_approval_with_targeted_revocation' as const,
    costComponents: APPROVAL_LIFECYCLE_GAS_COMPONENTS,
    entryGasEstimateUsdt,
    exitGasEstimateUsdt,
    unbufferedLifecycleGasUsdt: new D(entryGasEstimateUsdt)
      .plus(exitGasEstimateUsdt)
      .toFixed(),
    historicalGasGuarantee: false as const,
  };
}
