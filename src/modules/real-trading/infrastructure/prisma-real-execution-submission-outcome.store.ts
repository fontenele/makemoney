import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  RealExecutionSubmissionAttemptNotFoundError,
  RealExecutionSubmissionOutcome,
  RealExecutionSubmissionOutcomeBlockedError,
  RealExecutionSubmissionOutcomeConflictError,
  RealExecutionSubmissionOutcomeStore,
  StoredRealExecutionSubmissionOutcome,
} from '../application/real-execution-submission-outcome.store';
import { mapPersistedRealExecutionSubmissionAttempt } from './prisma-real-execution-submission-attempt.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const SAFE_ORDER_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/;
export class PrismaRealExecutionSubmissionOutcomeStore implements RealExecutionSubmissionOutcomeStore {
  constructor(private readonly prisma: PrismaService) {}

  async findByAttemptId(
    attemptId: string,
  ): Promise<StoredRealExecutionSubmissionOutcome | null> {
    if (!UUID_PATTERN.test(attemptId)) {
      throw new RealExecutionSubmissionOutcomeBlockedError();
    }
    const row = await this.prisma.realExecutionSubmissionOutcome.findUnique({
      where: { attemptId },
    });
    return row === null ? null : mapOutcome(row);
  }

  async record(
    outcome: RealExecutionSubmissionOutcome,
    completedAt: Date,
  ): Promise<{
    outcome: StoredRealExecutionSubmissionOutcome;
    replayed: boolean;
  }> {
    validateOutcome(outcome, completedAt);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261003, 34)`;
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261003, 40)`;

          const existing = await tx.realExecutionSubmissionOutcome.findUnique({
            where: { attemptId: outcome.attemptId },
          });
          if (existing) {
            const stored = mapOutcome(existing);
            if (!sameOutcome(stored, outcome, completedAt)) {
              throw new RealExecutionSubmissionOutcomeConflictError();
            }
            return { outcome: stored, replayed: true };
          }

          const attemptRow = await tx.realExecutionSubmissionAttempt.findUnique(
            {
              where: { id: outcome.attemptId },
            },
          );
          if (!attemptRow) {
            throw new RealExecutionSubmissionAttemptNotFoundError();
          }
          const attempt =
            mapPersistedRealExecutionSubmissionAttempt(attemptRow);
          if (
            attempt.gateId !== outcome.gateId ||
            completedAt.getTime() < attempt.claimedAt.getTime()
          ) {
            throw new RealExecutionSubmissionOutcomeBlockedError();
          }

          const existingReceipt =
            await tx.realExecutionSubmissionReceipt.findUnique({
              where: { gateId: outcome.gateId },
            });
          if (outcome.status === 'submitted_pending_confirmation') {
            if (
              existingReceipt !== null &&
              (existingReceipt.providerId !== 'agentic_wallet' ||
                existingReceipt.providerOrderId !== outcome.providerOrderId)
            ) {
              throw new RealExecutionSubmissionOutcomeConflictError();
            }
            if (existingReceipt === null) {
              await tx.realExecutionSubmissionReceipt.create({
                data: {
                  gateId: outcome.gateId,
                  providerId: 'agentic_wallet',
                  providerOrderId: outcome.providerOrderId!,
                  lifecycleStatus: 'pending_confirmation',
                  providerSubmissionAcknowledged: true,
                  terminal: false,
                  executionSucceeded: false,
                  statusLookupRequired: true,
                  automaticRetryAllowed: false,
                  recordedAt: completedAt,
                },
              });
            }
          } else if (existingReceipt !== null) {
            throw new RealExecutionSubmissionOutcomeConflictError();
          }

          const created = await tx.realExecutionSubmissionOutcome.create({
            data: {
              attemptId: outcome.attemptId,
              gateId: outcome.gateId,
              status: outcome.status,
              providerOrderId: outcome.providerOrderId,
              responseFingerprint: outcome.responseFingerprint,
              blockers: [...outcome.blockers],
              executionSucceeded: false,
              reconciliationRequired: true,
              automaticRetryAllowed: false,
              completedAt,
            },
          });
          return { outcome: mapOutcome(created), replayed: false };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034')
      ) {
        throw new RealExecutionSubmissionOutcomeConflictError();
      }
      throw error;
    }
  }
}

function validateOutcome(
  outcome: RealExecutionSubmissionOutcome,
  completedAt: Date,
): void {
  const pending = outcome.status === 'submitted_pending_confirmation';
  if (
    !UUID_PATTERN.test(outcome.attemptId) ||
    !UUID_PATTERN.test(outcome.gateId) ||
    !HASH_PATTERN.test(outcome.responseFingerprint) ||
    !(completedAt instanceof Date) ||
    !Number.isFinite(completedAt.getTime()) ||
    outcome.executionSucceeded !== false ||
    outcome.reconciliationRequired !== true ||
    outcome.automaticRetryAllowed !== false ||
    !Array.isArray(outcome.blockers) ||
    (pending
      ? !SAFE_ORDER_ID_PATTERN.test(outcome.providerOrderId ?? '') ||
        outcome.blockers.length !== 0
      : outcome.status !== 'submission_outcome_unknown' ||
        outcome.providerOrderId !== null ||
        outcome.blockers.length !== 1 ||
        !isUnknownOutcomeBlocker(outcome.blockers[0]))
  ) {
    throw new RealExecutionSubmissionOutcomeBlockedError();
  }
}

function isUnknownOutcomeBlocker(value: unknown): boolean {
  return (
    value === 'invalid_response_envelope' ||
    value === 'provider_reported_failure' ||
    value === 'invalid_provider_order_id'
  );
}

function mapOutcome(row: {
  attemptId: string;
  gateId: string;
  status: string;
  providerOrderId: string | null;
  responseFingerprint: string;
  blockers: Prisma.JsonValue;
  executionSucceeded: boolean;
  reconciliationRequired: boolean;
  automaticRetryAllowed: boolean;
  completedAt: Date;
}): StoredRealExecutionSubmissionOutcome {
  const value = {
    attemptId: row.attemptId,
    gateId: row.gateId,
    status: row.status,
    providerOrderId: row.providerOrderId,
    responseFingerprint: row.responseFingerprint,
    blockers: row.blockers,
    executionSucceeded: row.executionSucceeded,
    reconciliationRequired: row.reconciliationRequired,
    automaticRetryAllowed: row.automaticRetryAllowed,
  } as RealExecutionSubmissionOutcome;
  validateOutcome(value, row.completedAt);
  return {
    ...value,
    blockers: [...value.blockers],
    completedAt: new Date(row.completedAt),
  };
}

function sameOutcome(
  stored: StoredRealExecutionSubmissionOutcome,
  incoming: RealExecutionSubmissionOutcome,
  completedAt: Date,
): boolean {
  return (
    stored.attemptId === incoming.attemptId &&
    stored.gateId === incoming.gateId &&
    stored.status === incoming.status &&
    stored.providerOrderId === incoming.providerOrderId &&
    stored.responseFingerprint === incoming.responseFingerprint &&
    JSON.stringify(stored.blockers) === JSON.stringify(incoming.blockers) &&
    stored.completedAt.getTime() === completedAt.getTime()
  );
}
