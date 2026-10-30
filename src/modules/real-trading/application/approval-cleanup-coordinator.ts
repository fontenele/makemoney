import Decimal from 'decimal.js';
import {
  ApprovalCleanupEvent,
  ApprovalCleanupRecord,
  approvalCleanupPlanFingerprint,
} from './approval-cleanup';
const D = Decimal.clone({ precision: 100, toExpNeg: -100, toExpPos: 100 });
export interface CleanupExecutionPreflight {
  planFingerprint: string;
  operationOrderId: string;
  executionAuthorizationVerified: boolean;
  riskApproved: boolean;
  operationTerminalVerified: boolean;
  allowanceRaw: string;
  nativeBalanceBnb: string;
  gasEstimateBnb: string;
  reservedGasBnb: string;
  gasSafetyMultiplier: string;
  observedAt: Date;
}
export interface CleanupExecutionPort {
  preflight(record: ApprovalCleanupRecord): Promise<CleanupExecutionPreflight>;
  revoke(
    record: ApprovalCleanupRecord,
  ): Promise<{ providerOrderId: string } | null>;
}
export interface CleanupCoordinatorStore {
  unresolved(walletHash: string): Promise<ApprovalCleanupRecord[]>;
  transition(
    id: string,
    fingerprint: string,
    event: ApprovalCleanupEvent,
  ): Promise<ApprovalCleanupRecord>;
}
export interface CleanupExecutionControls {
  cleanupEnabled(): boolean;
  operatorSubmissionEnabled(): boolean;
  emergencyStopActive(): boolean;
}
export function cleanupPreflightIsAdmissible(
  record: ApprovalCleanupRecord,
  p: CleanupExecutionPreflight,
  now: Date,
): boolean {
  const amount = (v: unknown): v is string =>
    typeof v === 'string' && /^(?:0|[1-9]\d{0,19})(?:\.\d{1,18})?$/.test(v);
  if (
    record.state !== 'ready' ||
    approvalCleanupPlanFingerprint(record.plan) !== record.fingerprint ||
    p.planFingerprint !== record.fingerprint ||
    p.operationOrderId !== record.operationOrderId ||
    p.executionAuthorizationVerified !== true ||
    p.riskApproved !== true ||
    p.operationTerminalVerified !== true ||
    !(p.observedAt instanceof Date) ||
    !Number.isFinite(p.observedAt.getTime()) ||
    !Number.isFinite(now.getTime()) ||
    p.observedAt > now ||
    now.getTime() - p.observedAt.getTime() > 5000 ||
    typeof p.allowanceRaw !== 'string' ||
    !/^[1-9]\d{0,77}$/.test(p.allowanceRaw) ||
    BigInt(p.allowanceRaw) > (1n << 256n) - 1n ||
    ![
      p.nativeBalanceBnb,
      p.gasEstimateBnb,
      p.reservedGasBnb,
      p.gasSafetyMultiplier,
    ].every(amount)
  )
    return false;
  const margin = new D(p.gasSafetyMultiplier);
  const estimate = new D(p.gasEstimateBnb);
  const reserve = new D(p.reservedGasBnb);
  return (
    estimate.gt(0) &&
    margin.gt(1) &&
    margin.lte(10) &&
    reserve.gte(estimate.times(margin).toDecimalPlaces(18, Decimal.ROUND_UP)) &&
    new D(p.nativeBalanceBnb).gte(reserve)
  );
}
/** Unregistered internal orchestration. No live mutation transport is composed. */
export class ApprovalCleanupCoordinator {
  private readonly busy = new Set<string>();
  constructor(
    private readonly store: CleanupCoordinatorStore,
    private readonly port: CleanupExecutionPort,
    private readonly controls: CleanupExecutionControls,
    private readonly now: () => Date = () => new Date(),
  ) {}
  async run(walletHash: string, id: string, fingerprint: string) {
    const result = (
      status:
        | 'blocked'
        | 'busy'
        | 'accepted_pending_confirmation'
        | 'outcome_unknown'
        | 'claimed_blocked'
        | 'persistence_unavailable',
      providerMutationAttempted = false,
    ) => ({
      status,
      providerMutationAttempted,
      executionSucceeded: false as const,
      submissionAuthorized: false as const,
      automaticRetryAllowed: false as const,
    });
    if (
      !/^[a-f0-9]{64}$/.test(walletHash) ||
      !/^[a-f0-9-]{36}$/.test(id) ||
      !/^[a-f0-9]{64}$/.test(fingerprint) ||
      !this.allowed()
    )
      return result('blocked');
    if (this.busy.has(walletHash)) return result('busy');
    this.busy.add(walletHash);
    let attempted = false;
    let claimed = false;
    try {
      const records = await this.store.unresolved(walletHash);
      if (records.length !== 1) return result('blocked');
      const record = structuredClone(records[0]);
      if (
        record.plan.id !== id ||
        record.plan.walletHash !== walletHash ||
        record.fingerprint !== fingerprint ||
        record.state !== 'ready'
      )
        return result('blocked');
      const p = await this.port.preflight(structuredClone(record));
      if (
        !this.allowed() ||
        !cleanupPreflightIsAdmissible(record, p, this.now())
      )
        return result('blocked');
      const claim = await this.store.transition(id, fingerprint, {
        type: 'claim',
      });
      claimed = true;
      if (
        claim.state !== 'claimed' ||
        claim.plan.id !== id ||
        claim.plan.walletHash !== walletHash ||
        claim.fingerprint !== fingerprint ||
        approvalCleanupPlanFingerprint(claim.plan) !== fingerprint
      )
        return result('claimed_blocked');
      if (
        !this.allowed() ||
        !cleanupPreflightIsAdmissible(record, p, this.now())
      )
        return result('claimed_blocked');
      attempted = true;
      const response = await this.port.revoke(structuredClone(claim));
      if (
        !response ||
        typeof response.providerOrderId !== 'string' ||
        !/^[A-Za-z0-9_-]{1,256}$/.test(response.providerOrderId) ||
        response.providerOrderId === record.operationOrderId
      )
        throw new Error('Revocation result is ambiguous');
      await this.store.transition(id, fingerprint, {
        type: 'accepted',
        providerOrderId: response.providerOrderId,
      });
      return result('accepted_pending_confirmation', true);
    } catch {
      if (claimed && attempted) {
        try {
          await this.store.transition(id, fingerprint, { type: 'ambiguous' });
        } catch {
          /* A durable accepted/claimed state still blocks retries. */
        }
        return result('outcome_unknown', true);
      }
      return result('persistence_unavailable', attempted);
    } finally {
      this.busy.delete(walletHash);
    }
  }
  private allowed() {
    try {
      return (
        this.controls.cleanupEnabled() === true &&
        this.controls.operatorSubmissionEnabled() === true &&
        this.controls.emergencyStopActive() === false
      );
    } catch {
      return false;
    }
  }
}
