import Decimal from 'decimal.js';

const Exact = Decimal.clone({ precision: 100, toExpNeg: -100, toExpPos: 100 });
const NONNEGATIVE = /^(?:0|[1-9]\d{0,19})(?:\.\d{1,18})?$/;
const SIGNED = /^-?(?:0|[1-9]\d{0,19})(?:\.\d{1,18})?$/;

export interface AutonomousDailyLossSnapshot {
  /** Daily net economic PnL includes marked open positions, fees and failed-order gas. */
  netPnlUsdt: string;
  outstandingPotentialLossUsdt: string;
  heldBaseQuantity: string;
  utcDay: string;
  observedAt: Date;
  coverage: 'complete' | 'partial';
}

export type AutonomousLossCandidate =
  | { kind: 'entry'; maximumPotentialLossUsdt: string }
  | { kind: 'protective_exit'; sellBaseQuantity: string };

/** Internal arithmetic policy only; an unverified/caller snapshot cannot authorize execution. */
export function assessAutonomousDailyLoss(
  maximumDailyLossUsdt: string | null,
  protectiveExitsAllowed: boolean,
  snapshot: AutonomousDailyLossSnapshot,
  candidate: AutonomousLossCandidate,
  evaluatedAt: Date,
) {
  const result = (
    status: 'within_loss_policy' | 'blocked',
    reason: string,
    projectedLossUsdt: string | null = null,
  ) => ({
    status,
    reason,
    projectedLossUsdt,
    riskApproved: false as const,
    submissionAuthorized: false as const,
  });
  if (
    maximumDailyLossUsdt === null ||
    typeof maximumDailyLossUsdt !== 'string' ||
    !NONNEGATIVE.test(maximumDailyLossUsdt) ||
    !new Exact(maximumDailyLossUsdt).gt(0)
  )
    return result('blocked', 'daily_loss_limit_invalid');
  if (
    typeof snapshot.netPnlUsdt !== 'string' ||
    !SIGNED.test(snapshot.netPnlUsdt) ||
    typeof snapshot.outstandingPotentialLossUsdt !== 'string' ||
    !NONNEGATIVE.test(snapshot.outstandingPotentialLossUsdt) ||
    typeof snapshot.heldBaseQuantity !== 'string' ||
    !NONNEGATIVE.test(snapshot.heldBaseQuantity) ||
    snapshot.coverage !== 'complete'
  )
    return result('blocked', 'daily_loss_accounting_incomplete');
  if (
    !(evaluatedAt instanceof Date) ||
    !Number.isFinite(evaluatedAt.getTime()) ||
    !(snapshot.observedAt instanceof Date) ||
    !Number.isFinite(snapshot.observedAt.getTime()) ||
    snapshot.observedAt > evaluatedAt ||
    evaluatedAt.getTime() - snapshot.observedAt.getTime() > 5000 ||
    snapshot.utcDay !== evaluatedAt.toISOString().slice(0, 10) ||
    snapshot.observedAt.toISOString().slice(0, 10) !== snapshot.utcDay
  )
    return result('blocked', 'daily_loss_evidence_stale_or_wrong_day');
  if (candidate.kind === 'protective_exit') {
    if (!protectiveExitsAllowed)
      return result('blocked', 'protective_exits_not_authorized');
    if (
      typeof candidate.sellBaseQuantity !== 'string' ||
      !NONNEGATIVE.test(candidate.sellBaseQuantity) ||
      !new Exact(candidate.sellBaseQuantity).gt(0) ||
      new Exact(candidate.sellBaseQuantity).gt(snapshot.heldBaseQuantity)
    )
      return result('blocked', 'exit_exceeds_verified_position');
    return result('within_loss_policy', 'protective_exit_reduces_position');
  }
  if (
    typeof candidate.maximumPotentialLossUsdt !== 'string' ||
    !NONNEGATIVE.test(candidate.maximumPotentialLossUsdt) ||
    !new Exact(candidate.maximumPotentialLossUsdt).gt(0)
  )
    return result('blocked', 'entry_loss_reserve_invalid');
  const currentLoss = Exact.max(0, new Exact(snapshot.netPnlUsdt).negated());
  const projected = currentLoss
    .plus(snapshot.outstandingPotentialLossUsdt)
    .plus(candidate.maximumPotentialLossUsdt);
  if (
    currentLoss.gte(maximumDailyLossUsdt) ||
    projected.gt(maximumDailyLossUsdt)
  )
    return result(
      'blocked',
      'daily_loss_capacity_exceeded',
      projected.toFixed(),
    );
  return result(
    'within_loss_policy',
    'entry_within_daily_loss_capacity',
    projected.toFixed(),
  );
}
