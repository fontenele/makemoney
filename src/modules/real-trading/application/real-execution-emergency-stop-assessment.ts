import { StoredRealExecutionArm } from './real-execution-arm-store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CHANGE_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const AGENTIC_WALLET_PROVIDER_ID = 'agentic_wallet';
const BSC_CHAIN_ID = '56';
const MAXIMUM_SNAPSHOT_AGE_MS = 60_000;

export interface RealExecutionEmergencyStopSnapshot {
  readonly active: boolean;
  readonly source: 'configuration' | 'persisted';
  readonly changeId: string | null;
  readonly changedAt: Date | null;
  readonly coverage: 'complete' | 'partial';
  readonly observedAt: Date;
}

export interface RealExecutionEmergencyStopFreshnessPolicy {
  readonly snapshotMaxAgeMs: number;
}

export type RealExecutionEmergencyStopBlocker =
  | 'invalid_arm'
  | 'invalid_emergency_stop_snapshot'
  | 'invalid_evaluation_time'
  | 'arm_from_future'
  | 'arm_expired'
  | 'emergency_stop_snapshot_from_future'
  | 'emergency_stop_snapshot_stale'
  | 'emergency_stop_coverage_incomplete'
  | 'emergency_stop_not_persisted'
  | 'emergency_stop_change_from_future'
  | 'emergency_stop_observed_before_arm'
  | 'emergency_stop_changed_after_arm'
  | 'emergency_stop_active';

export interface RealExecutionEmergencyStopAssessment {
  readonly scope: 'real_execution_emergency_stop';
  readonly status: 'emergency_stop_clear_for_arm' | 'blocked';
  readonly blockers: readonly RealExecutionEmergencyStopBlocker[];
  readonly armId: string | null;
  readonly emergencyStopChangeId: string | null;
  readonly emergencyStopChecked: boolean;
  readonly atomicEnforcement: false;
  readonly riskApproved: false;
  readonly confirmationRecorded: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function assessRealExecutionEmergencyStop(
  arm: StoredRealExecutionArm,
  snapshot: RealExecutionEmergencyStopSnapshot,
  freshness: RealExecutionEmergencyStopFreshnessPolicy,
  evaluatedAt: Date,
): RealExecutionEmergencyStopAssessment {
  validateFreshnessPolicy(freshness);
  const blockers: RealExecutionEmergencyStopBlocker[] = [];
  const armValid = isValidArm(arm);
  const snapshotValid = isValidSnapshot(snapshot);
  const evaluationTimeValid = isValidDate(evaluatedAt);

  addIf(blockers, !armValid, 'invalid_arm');
  addIf(blockers, !snapshotValid, 'invalid_emergency_stop_snapshot');
  addIf(blockers, !evaluationTimeValid, 'invalid_evaluation_time');

  if (armValid && evaluationTimeValid) {
    addIf(
      blockers,
      arm.createdAt.getTime() > evaluatedAt.getTime(),
      'arm_from_future',
    );
    addIf(
      blockers,
      arm.expiresAt.getTime() <= evaluatedAt.getTime(),
      'arm_expired',
    );
  }

  if (snapshotValid && evaluationTimeValid) {
    const snapshotAgeMs = evaluatedAt.getTime() - snapshot.observedAt.getTime();
    addIf(blockers, snapshotAgeMs < 0, 'emergency_stop_snapshot_from_future');
    addIf(
      blockers,
      snapshotAgeMs > freshness.snapshotMaxAgeMs,
      'emergency_stop_snapshot_stale',
    );
    addIf(
      blockers,
      snapshot.coverage !== 'complete',
      'emergency_stop_coverage_incomplete',
    );
    addIf(
      blockers,
      snapshot.source !== 'persisted',
      'emergency_stop_not_persisted',
    );
    addIf(blockers, snapshot.active, 'emergency_stop_active');

    if (snapshot.source === 'persisted') {
      addIf(
        blockers,
        snapshot.changedAt!.getTime() > snapshot.observedAt.getTime() ||
          snapshot.changedAt!.getTime() > evaluatedAt.getTime(),
        'emergency_stop_change_from_future',
      );
    }

    if (armValid) {
      addIf(
        blockers,
        snapshot.observedAt.getTime() <= arm.createdAt.getTime(),
        'emergency_stop_observed_before_arm',
      );
      if (snapshot.source === 'persisted') {
        addIf(
          blockers,
          snapshot.changedAt!.getTime() >= arm.createdAt.getTime(),
          'emergency_stop_changed_after_arm',
        );
      }
    }
  }

  return {
    scope: 'real_execution_emergency_stop',
    status: blockers.length === 0 ? 'emergency_stop_clear_for_arm' : 'blocked',
    blockers,
    armId: armValid ? arm.id : null,
    emergencyStopChangeId:
      snapshotValid && snapshot.source === 'persisted'
        ? snapshot.changeId
        : null,
    emergencyStopChecked: snapshotValid,
    atomicEnforcement: false,
    riskApproved: false,
    confirmationRecorded: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function validateFreshnessPolicy(
  freshness: RealExecutionEmergencyStopFreshnessPolicy,
): void {
  if (
    typeof freshness !== 'object' ||
    freshness === null ||
    !Number.isSafeInteger(freshness.snapshotMaxAgeMs) ||
    freshness.snapshotMaxAgeMs < 1 ||
    freshness.snapshotMaxAgeMs > MAXIMUM_SNAPSHOT_AGE_MS
  ) {
    throw new RangeError(
      'Real execution emergency-stop snapshot maximum age must be 1-60000 ms',
    );
  }
}

function isValidArm(arm: StoredRealExecutionArm): boolean {
  return (
    typeof arm === 'object' &&
    arm !== null &&
    UUID_PATTERN.test(arm.id) &&
    UUID_PATTERN.test(arm.reservationId) &&
    arm.providerId === AGENTIC_WALLET_PROVIDER_ID &&
    arm.chainId === BSC_CHAIN_ID &&
    UUID_PATTERN.test(arm.intentId) &&
    UUID_PATTERN.test(arm.quoteId) &&
    arm.payloadCommitmentVersion === 'real_execution_intent_quote_v1' &&
    /^[a-f0-9]{64}$/.test(arm.payloadCommitmentDigest) &&
    arm.acknowledgment === 'reservation_and_quote_reviewed' &&
    isValidDate(arm.requestedAt) &&
    isValidDate(arm.createdAt) &&
    isValidDate(arm.expiresAt) &&
    arm.requestedAt.getTime() <= arm.createdAt.getTime() &&
    arm.createdAt.getTime() < arm.expiresAt.getTime()
  );
}

function isValidSnapshot(
  snapshot: RealExecutionEmergencyStopSnapshot,
): boolean {
  if (
    typeof snapshot !== 'object' ||
    snapshot === null ||
    typeof snapshot.active !== 'boolean' ||
    (snapshot.source !== 'configuration' && snapshot.source !== 'persisted') ||
    (snapshot.coverage !== 'complete' && snapshot.coverage !== 'partial') ||
    !isValidDate(snapshot.observedAt)
  ) {
    return false;
  }

  if (snapshot.source === 'persisted') {
    return (
      typeof snapshot.changeId === 'string' &&
      CHANGE_ID_PATTERN.test(snapshot.changeId) &&
      isValidDate(snapshot.changedAt)
    );
  }

  return snapshot.changeId === null && snapshot.changedAt === null;
}

function isValidDate(value: Date | null): value is Date {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function addIf(
  blockers: RealExecutionEmergencyStopBlocker[],
  condition: boolean,
  blocker: RealExecutionEmergencyStopBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
