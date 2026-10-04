import { createHash } from 'node:crypto';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { StoredRealExecutionFinalConfirmation } from '../application/real-execution-final-confirmation-store';
import { assessRealExecutionProviderCommandPayload } from '../application/real-execution-provider-command-payload';
import { assessRealExecutionSubmissionEmergencyStop } from '../application/real-execution-submission-emergency-stop';
import {
  RealExecutionSubmissionGateBlockedError,
  RealExecutionSubmissionGateCommand,
  RealExecutionSubmissionGateConfirmationNotFoundError,
  RealExecutionSubmissionGateIdempotencyConflictError,
  RealExecutionSubmissionGateIdentityConflictError,
  RealExecutionSubmissionGateStore,
  StoredRealExecutionSubmissionGate,
} from '../application/real-execution-submission-gate-store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const EMERGENCY_STOP_CONTROL = 'emergency_stop';

export class PrismaRealExecutionSubmissionGateStore implements RealExecutionSubmissionGateStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async create(command: RealExecutionSubmissionGateCommand): Promise<{
    gate: StoredRealExecutionSubmissionGate;
    replayed: boolean;
  }> {
    if (!UUID_PATTERN.test(command.id)) {
      throw new RealExecutionSubmissionGateBlockedError(['invalid_gate_id']);
    }
    const requestFingerprint = fingerprint(command);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261003, 34)`;

        const existing = await tx.realExecutionSubmissionGate.findUnique({
          where: { id: command.id },
        });
        if (existing) {
          if (existing.requestFingerprint !== requestFingerprint) {
            throw new RealExecutionSubmissionGateIdempotencyConflictError();
          }
          return {
            gate: mapPersistedRealExecutionSubmissionGate(existing),
            replayed: true,
          };
        }

        const confirmationRow =
          await tx.realExecutionFinalConfirmation.findUnique({
            where: { id: command.submissionPlan.confirmationId },
          });
        if (!confirmationRow) {
          throw new RealExecutionSubmissionGateConfirmationNotFoundError();
        }

        const identityConflict = await tx.realExecutionSubmissionGate.findFirst(
          {
            where: {
              OR: [
                { confirmationId: confirmationRow.id },
                { approvalId: confirmationRow.approvalId },
                { reservationId: confirmationRow.reservationId },
                { armId: confirmationRow.armId },
                { submissionPlanId: command.submissionPlan.id },
                { intentId: confirmationRow.intentId },
                { quoteId: confirmationRow.quoteId },
              ],
            },
            select: { id: true },
          },
        );
        if (identityConflict) {
          throw new RealExecutionSubmissionGateIdentityConflictError();
        }

        const evaluatedAt = this.now();
        const emergencyStopRow = await tx.riskControlEvent.findFirst({
          where: { control: EMERGENCY_STOP_CONTROL },
          orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
        });
        const confirmation = mapConfirmation(confirmationRow);
        const stopAssessment = assessRealExecutionSubmissionEmergencyStop(
          confirmation,
          emergencyStopRow
            ? {
                active: emergencyStopRow.active,
                source: 'persisted',
                changeId: emergencyStopRow.id,
                changedAt: new Date(emergencyStopRow.changedAt),
                coverage: 'complete',
                observedAt: evaluatedAt,
              }
            : {
                active: true,
                source: 'configuration',
                changeId: null,
                changedAt: null,
                coverage: 'partial',
                observedAt: evaluatedAt,
              },
          command.emergencyStopPolicy,
          evaluatedAt,
        );
        const payloadAssessment = assessRealExecutionProviderCommandPayload(
          confirmation,
          command.submissionPlan,
          command.intent,
          command.quote,
          evaluatedAt,
        );
        const blockers = [
          ...stopAssessment.blockers,
          ...payloadAssessment.blockers,
        ];
        if (blockers.length > 0 || payloadAssessment.payload === null) {
          throw new RealExecutionSubmissionGateBlockedError(blockers);
        }

        const payload = payloadAssessment.payload;
        const created = await tx.realExecutionSubmissionGate.create({
          data: {
            id: command.id,
            confirmationId: confirmation.id,
            approvalId: confirmation.approvalId,
            reservationId: confirmation.reservationId,
            armId: confirmation.armId,
            submissionPlanId: command.submissionPlan.id,
            providerId: payload.providerId,
            chainId: payload.chainId,
            intentId: confirmation.intentId,
            quoteId: confirmation.quoteId,
            payloadCommitmentVersion: payload.payloadCommitmentVersion,
            payloadCommitmentDigest: payload.payloadCommitmentDigest,
            emergencyStopChangeId: confirmation.emergencyStopChangeId,
            sourceTokenAddress: payload.sourceTokenAddress,
            targetTokenAddress: payload.targetTokenAddress,
            sourceQuantity: payload.sourceQuantity,
            maximumSlippagePercent: payload.maximumSlippagePercent,
            mevProtection: payload.mevProtection,
            gasLevel: payload.gasLevel,
            status: 'prepared_not_submitted',
            requestFingerprint,
            emergencyStopRecheckedAt: evaluatedAt,
            confirmationConsumedAt: evaluatedAt,
            expiresAt: command.submissionPlan.expiresAt,
            createdAt: evaluatedAt,
          },
        });
        return {
          gate: mapPersistedRealExecutionSubmissionGate(created),
          replayed: false,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function fingerprint(command: RealExecutionSubmissionGateCommand): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(command)))
    .digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function mapConfirmation(row: {
  id: string;
  approvalId: string;
  reservationId: string;
  armId: string;
  providerId: string;
  chainId: string;
  intentId: string;
  quoteId: string;
  payloadCommitmentVersion: string | null;
  payloadCommitmentDigest: string | null;
  emergencyStopChangeId: string;
  acknowledgment: string;
  requestedAt: Date;
  expiresAt: Date;
  createdAt: Date;
}): StoredRealExecutionFinalConfirmation {
  if (
    row.acknowledgment !==
    'risk_approval_and_final_quote_reviewed_for_immediate_submission'
  ) {
    throw new Error('Persisted final confirmation has invalid acknowledgment');
  }
  if (
    row.payloadCommitmentVersion !== 'real_execution_intent_quote_v1' ||
    row.payloadCommitmentDigest === null ||
    !/^[a-f0-9]{64}$/.test(row.payloadCommitmentDigest)
  ) {
    throw new Error(
      'Persisted final confirmation has invalid payload commitment',
    );
  }
  return {
    ...row,
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: row.payloadCommitmentDigest,
    acknowledgment:
      'risk_approval_and_final_quote_reviewed_for_immediate_submission',
    requestedAt: new Date(row.requestedAt),
    expiresAt: new Date(row.expiresAt),
    createdAt: new Date(row.createdAt),
    riskApproved: true,
    confirmationRecorded: true,
    emergencyStopRecheckedForSubmission: false,
    submissionAuthorized: false,
  };
}

export function mapPersistedRealExecutionSubmissionGate(row: {
  id: string;
  confirmationId: string;
  approvalId: string;
  reservationId: string;
  armId: string;
  submissionPlanId: string;
  providerId: string;
  chainId: string;
  intentId: string;
  quoteId: string;
  payloadCommitmentVersion: string;
  payloadCommitmentDigest: string;
  emergencyStopChangeId: string;
  sourceTokenAddress: string;
  targetTokenAddress: string;
  sourceQuantity: string;
  maximumSlippagePercent: string;
  mevProtection: boolean;
  gasLevel: string;
  status: string;
  emergencyStopRecheckedAt: Date;
  confirmationConsumedAt: Date;
  expiresAt: Date | null;
  createdAt: Date;
}): StoredRealExecutionSubmissionGate {
  if (
    row.providerId !== 'agentic_wallet' ||
    row.chainId !== '56' ||
    row.payloadCommitmentVersion !== 'real_execution_intent_quote_v1' ||
    !/^[a-f0-9]{64}$/.test(row.payloadCommitmentDigest) ||
    row.mevProtection !== true ||
    row.gasLevel !== 'MEDIUM' ||
    row.status !== 'prepared_not_submitted' ||
    row.expiresAt === null ||
    row.emergencyStopRecheckedAt.getTime() !==
      row.confirmationConsumedAt.getTime() ||
    row.expiresAt.getTime() <= row.confirmationConsumedAt.getTime()
  ) {
    throw new Error('Persisted real execution submission gate is invalid');
  }
  return {
    id: row.id,
    confirmationId: row.confirmationId,
    approvalId: row.approvalId,
    reservationId: row.reservationId,
    armId: row.armId,
    submissionPlanId: row.submissionPlanId,
    providerId: 'agentic_wallet',
    chainId: '56',
    intentId: row.intentId,
    quoteId: row.quoteId,
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: row.payloadCommitmentDigest,
    emergencyStopChangeId: row.emergencyStopChangeId,
    sourceTokenAddress: row.sourceTokenAddress,
    targetTokenAddress: row.targetTokenAddress,
    sourceQuantity: row.sourceQuantity,
    maximumSlippagePercent: row.maximumSlippagePercent,
    mevProtection: true,
    gasLevel: 'MEDIUM',
    status: 'prepared_not_submitted',
    emergencyStopRecheckedAt: new Date(row.emergencyStopRecheckedAt),
    confirmationConsumedAt: new Date(row.confirmationConsumedAt),
    expiresAt: new Date(row.expiresAt),
    createdAt: new Date(row.createdAt),
    atomicGateSatisfied: true,
    confirmationConsumed: true,
    providerSubmissionStarted: false,
    submissionAuthorized: false,
  };
}
