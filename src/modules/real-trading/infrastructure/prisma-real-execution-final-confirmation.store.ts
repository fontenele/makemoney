import { createHash } from 'node:crypto';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { planRealExecutionFinalConfirmation } from '../application/real-execution-final-confirmation-plan';
import {
  RealExecutionFinalConfirmationApprovalNotFoundError,
  RealExecutionFinalConfirmationCommand,
  RealExecutionFinalConfirmationIdempotencyConflictError,
  RealExecutionFinalConfirmationIdentityConflictError,
  RealExecutionFinalConfirmationPlanError,
  RealExecutionFinalConfirmationStore,
  StoredRealExecutionFinalConfirmation,
} from '../application/real-execution-final-confirmation-store';
import { StoredRealExecutionRiskApproval } from '../application/real-execution-risk-approval-store';

const ACKNOWLEDGMENT =
  'risk_approval_and_final_quote_reviewed_for_immediate_submission';

export class PrismaRealExecutionFinalConfirmationStore implements RealExecutionFinalConfirmationStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async confirm(command: RealExecutionFinalConfirmationCommand): Promise<{
    confirmation: StoredRealExecutionFinalConfirmation;
    replayed: boolean;
  }> {
    const requestFingerprint = fingerprint(command);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261002, 25)`;

        const existing = await tx.realExecutionFinalConfirmation.findUnique({
          where: { id: command.request.id },
        });
        if (existing) {
          if (existing.requestFingerprint !== requestFingerprint) {
            throw new RealExecutionFinalConfirmationIdempotencyConflictError();
          }
          return { confirmation: mapConfirmation(existing), replayed: true };
        }

        const approvalRow = await tx.realExecutionRiskApproval.findUnique({
          where: { id: command.request.approvalId },
        });
        if (!approvalRow) {
          throw new RealExecutionFinalConfirmationApprovalNotFoundError();
        }

        const identityConflict =
          await tx.realExecutionFinalConfirmation.findFirst({
            where: {
              OR: [
                { approvalId: approvalRow.id },
                { reservationId: approvalRow.reservationId },
                { armId: approvalRow.armId },
                { intentId: approvalRow.intentId },
                { quoteId: approvalRow.quoteId },
              ],
            },
            select: { id: true },
          });
        if (identityConflict) {
          throw new RealExecutionFinalConfirmationIdentityConflictError();
        }

        const assessment = planRealExecutionFinalConfirmation(
          mapApproval(approvalRow),
          command.request,
          command.policy,
          this.now(),
        );
        if (assessment.plan === null) {
          throw new RealExecutionFinalConfirmationPlanError(
            assessment.blockers,
          );
        }

        const created = await tx.realExecutionFinalConfirmation.create({
          data: {
            ...assessment.plan,
            requestFingerprint,
          },
        });
        return { confirmation: mapConfirmation(created), replayed: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function fingerprint(command: RealExecutionFinalConfirmationCommand): string {
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

function mapApproval(row: {
  id: string;
  reservationId: string;
  armId: string;
  providerId: string;
  chainId: string;
  intentId: string;
  quoteId: string;
  payloadCommitmentVersion: string | null;
  payloadCommitmentDigest: string | null;
  emergencyStopChangeId: string;
  revalidatedAt: Date;
  expiresAt: Date;
  createdAt: Date;
}): StoredRealExecutionRiskApproval {
  if (
    row.payloadCommitmentVersion !== 'real_execution_intent_quote_v1' ||
    row.payloadCommitmentDigest === null ||
    !/^[a-f0-9]{64}$/.test(row.payloadCommitmentDigest)
  ) {
    throw new Error(
      'Persisted real execution risk approval has invalid payload commitment',
    );
  }
  return {
    ...row,
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: row.payloadCommitmentDigest,
    revalidatedAt: new Date(row.revalidatedAt),
    expiresAt: new Date(row.expiresAt),
    createdAt: new Date(row.createdAt),
    riskApproved: true,
    confirmationRecorded: false,
    submissionAuthorized: false,
  };
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
  emergencyStopChangeId: string;
  acknowledgment: string;
  requestedAt: Date;
  expiresAt: Date;
  createdAt: Date;
}): StoredRealExecutionFinalConfirmation {
  if (row.acknowledgment !== ACKNOWLEDGMENT) {
    throw new Error('Persisted final confirmation has invalid acknowledgment');
  }
  return {
    id: row.id,
    approvalId: row.approvalId,
    reservationId: row.reservationId,
    armId: row.armId,
    providerId: row.providerId,
    chainId: row.chainId,
    intentId: row.intentId,
    quoteId: row.quoteId,
    emergencyStopChangeId: row.emergencyStopChangeId,
    acknowledgment: ACKNOWLEDGMENT,
    requestedAt: new Date(row.requestedAt),
    expiresAt: new Date(row.expiresAt),
    createdAt: new Date(row.createdAt),
    riskApproved: true,
    confirmationRecorded: true,
    emergencyStopRecheckedForSubmission: false,
    submissionAuthorized: false,
  };
}
