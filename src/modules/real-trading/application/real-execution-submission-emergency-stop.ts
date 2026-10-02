import { RealExecutionEmergencyStopSnapshot } from './real-execution-emergency-stop-assessment';
import { StoredRealExecutionFinalConfirmation } from './real-execution-final-confirmation-store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const CHANGE_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const AGENTIC_WALLET_PROVIDER_ID = 'agentic_wallet';
const BSC_CHAIN_ID = '56';
const ACKNOWLEDGMENT =
  'risk_approval_and_final_quote_reviewed_for_immediate_submission';
const MAXIMUM_SNAPSHOT_AGE_MS = 60_000;

export interface RealExecutionSubmissionEmergencyStopPolicy {
  readonly snapshotMaxAgeMs: number;
}

export type RealExecutionSubmissionEmergencyStopBlocker =
  | 'invalid_final_confirmation'
  | 'invalid_emergency_stop_snapshot'
  | 'invalid_evaluation_time'
  | 'confirmation_from_future'
  | 'confirmation_expired'
  | 'emergency_stop_snapshot_from_future'
  | 'emergency_stop_snapshot_stale'
  | 'emergency_stop_coverage_incomplete'
  | 'emergency_stop_not_persisted'
  | 'emergency_stop_change_from_future'
  | 'emergency_stop_observed_before_confirmation'
  | 'emergency_stop_change_mismatch'
  | 'emergency_stop_changed_after_confirmation'
  | 'emergency_stop_active';

export interface RealExecutionSubmissionEmergencyStopAssessment {
  readonly scope: 'real_execution_submission_emergency_stop';
  readonly status: 'emergency_stop_clear_for_submission_review' | 'blocked';
  readonly blockers: readonly RealExecutionSubmissionEmergencyStopBlocker[];
  readonly confirmationId: string | null;
  readonly emergencyStopChangeId: string | null;
  readonly riskApproved: boolean;
  readonly confirmationRecorded: boolean;
  readonly emergencyStopRecheckedForSubmission: boolean;
  readonly atomicEnforcement: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function assessRealExecutionSubmissionEmergencyStop(
  confirmation: StoredRealExecutionFinalConfirmation,
  snapshot: RealExecutionEmergencyStopSnapshot,
  policy: RealExecutionSubmissionEmergencyStopPolicy,
  evaluatedAt: Date,
): RealExecutionSubmissionEmergencyStopAssessment {
  validatePolicy(policy);
  const blockers: RealExecutionSubmissionEmergencyStopBlocker[] = [];
  const confirmationValid = isValidConfirmation(confirmation);
  const snapshotValid = isValidSnapshot(snapshot);
  const evaluationTimeValid = isValidDate(evaluatedAt);
  addIf(blockers, !confirmationValid, 'invalid_final_confirmation');
  addIf(blockers, !snapshotValid, 'invalid_emergency_stop_snapshot');
  addIf(blockers, !evaluationTimeValid, 'invalid_evaluation_time');

  if (confirmationValid && evaluationTimeValid) {
    addIf(
      blockers,
      confirmation.createdAt.getTime() > evaluatedAt.getTime(),
      'confirmation_from_future',
    );
    addIf(
      blockers,
      confirmation.expiresAt.getTime() <= evaluatedAt.getTime(),
      'confirmation_expired',
    );
  }

  if (snapshotValid && evaluationTimeValid) {
    const snapshotAgeMs = evaluatedAt.getTime() - snapshot.observedAt.getTime();
    addIf(blockers, snapshotAgeMs < 0, 'emergency_stop_snapshot_from_future');
    addIf(
      blockers,
      snapshotAgeMs > policy.snapshotMaxAgeMs,
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

    if (confirmationValid) {
      addIf(
        blockers,
        snapshot.observedAt.getTime() <= confirmation.createdAt.getTime(),
        'emergency_stop_observed_before_confirmation',
      );
      if (snapshot.source === 'persisted') {
        addIf(
          blockers,
          snapshot.changeId !== confirmation.emergencyStopChangeId,
          'emergency_stop_change_mismatch',
        );
        addIf(
          blockers,
          snapshot.changedAt!.getTime() >= confirmation.createdAt.getTime(),
          'emergency_stop_changed_after_confirmation',
        );
      }
    }
  }

  const ready = blockers.length === 0;
  return {
    scope: 'real_execution_submission_emergency_stop',
    status: ready ? 'emergency_stop_clear_for_submission_review' : 'blocked',
    blockers,
    confirmationId: confirmationValid ? confirmation.id : null,
    emergencyStopChangeId:
      snapshotValid && snapshot.source === 'persisted'
        ? snapshot.changeId
        : null,
    riskApproved: ready,
    confirmationRecorded: ready,
    emergencyStopRecheckedForSubmission: snapshotValid,
    atomicEnforcement: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function validatePolicy(policy: RealExecutionSubmissionEmergencyStopPolicy) {
  if (
    typeof policy !== 'object' ||
    policy === null ||
    !Number.isSafeInteger(policy.snapshotMaxAgeMs) ||
    policy.snapshotMaxAgeMs < 1 ||
    policy.snapshotMaxAgeMs > MAXIMUM_SNAPSHOT_AGE_MS
  ) {
    throw new RangeError(
      'Submission emergency-stop snapshot maximum age must be 1-60000 ms',
    );
  }
}

function isValidConfirmation(
  confirmation: StoredRealExecutionFinalConfirmation,
): boolean {
  return (
    typeof confirmation === 'object' &&
    confirmation !== null &&
    UUID_PATTERN.test(confirmation.id) &&
    UUID_PATTERN.test(confirmation.approvalId) &&
    UUID_PATTERN.test(confirmation.reservationId) &&
    UUID_PATTERN.test(confirmation.armId) &&
    confirmation.providerId === AGENTIC_WALLET_PROVIDER_ID &&
    confirmation.chainId === BSC_CHAIN_ID &&
    UUID_PATTERN.test(confirmation.intentId) &&
    UUID_PATTERN.test(confirmation.quoteId) &&
    CHANGE_ID_PATTERN.test(confirmation.emergencyStopChangeId) &&
    confirmation.acknowledgment === ACKNOWLEDGMENT &&
    isValidDate(confirmation.requestedAt) &&
    isValidDate(confirmation.createdAt) &&
    isValidDate(confirmation.expiresAt) &&
    confirmation.requestedAt.getTime() <= confirmation.createdAt.getTime() &&
    confirmation.createdAt.getTime() < confirmation.expiresAt.getTime() &&
    confirmation.riskApproved === true &&
    confirmation.confirmationRecorded === true &&
    confirmation.emergencyStopRecheckedForSubmission === false &&
    confirmation.submissionAuthorized === false
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
  blockers: RealExecutionSubmissionEmergencyStopBlocker[],
  condition: boolean,
  blocker: RealExecutionSubmissionEmergencyStopBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
