import { createHash } from 'node:crypto';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { StoredRealExecutionArm } from '../application/real-execution-arm-store';
import {
  RealExecutionActiveReservation,
  RealExecutionReservationCapacitySnapshot,
} from '../application/real-execution-reservation-capacity';
import { StoredRealExecutionReservation } from '../application/real-execution-reservation-store';
import {
  RealExecutionRiskApprovalArtifactNotFoundError,
  RealExecutionRiskApprovalBlockedError,
  RealExecutionRiskApprovalCommand,
  RealExecutionRiskApprovalIdempotencyConflictError,
  RealExecutionRiskApprovalIdentityConflictError,
  RealExecutionRiskApprovalStore,
  StoredRealExecutionRiskApproval,
} from '../application/real-execution-risk-approval-store';
import { revalidateRealExecutionRisk } from '../application/real-execution-risk-revalidation';

const ACTIVE_RESERVATION_READ_LIMIT = 101;
const EMERGENCY_STOP_CONTROL = 'emergency_stop';

export class PrismaRealExecutionRiskApprovalStore implements RealExecutionRiskApprovalStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async approve(command: RealExecutionRiskApprovalCommand): Promise<{
    approval: StoredRealExecutionRiskApproval;
    replayed: boolean;
  }> {
    const requestFingerprint = fingerprint(command);
    return this.prisma.$transaction(
      async (tx) => {
        // Share the reservation lock so the complete active set cannot change
        // between revalidation and approval persistence.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261001, 18)`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261002, 23)`;

        const existing = await tx.realExecutionRiskApproval.findUnique({
          where: { id: command.request.id },
        });
        if (existing) {
          if (existing.requestFingerprint !== requestFingerprint) {
            throw new RealExecutionRiskApprovalIdempotencyConflictError();
          }
          return { approval: mapApproval(existing), replayed: true };
        }

        const [reservationRow, armRow] = await Promise.all([
          tx.realExecutionReservation.findUnique({
            where: { id: command.request.reservationId },
          }),
          tx.realExecutionArm.findUnique({
            where: { id: command.request.armId },
          }),
        ]);
        if (!reservationRow || !armRow) {
          throw new RealExecutionRiskApprovalArtifactNotFoundError();
        }

        const identityConflict = await tx.realExecutionRiskApproval.findFirst({
          where: {
            OR: [
              { reservationId: reservationRow.id },
              { armId: armRow.id },
              { intentId: reservationRow.intentId },
              { quoteId: reservationRow.quoteId },
            ],
          },
          select: { id: true },
        });
        if (identityConflict) {
          throw new RealExecutionRiskApprovalIdentityConflictError();
        }

        const evaluatedAt = this.now();
        const utcDay = evaluatedAt.toISOString().slice(0, 10);
        const [activeRows, emergencyStopRow] = await Promise.all([
          tx.realExecutionReservation.findMany({
            where: {
              providerId: command.quote.providerId,
              chainId: command.intent.chainId,
              utcDay: new Date(`${utcDay}T00:00:00.000Z`),
              expiresAt: { gt: evaluatedAt },
            },
            orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
            take: ACTIVE_RESERVATION_READ_LIMIT,
          }),
          tx.riskControlEvent.findFirst({
            where: { control: EMERGENCY_STOP_CONTROL },
            orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
          }),
        ]);
        const reservationSnapshot: RealExecutionReservationCapacitySnapshot = {
          providerId: command.quote.providerId,
          chainId: command.intent.chainId,
          utcDay,
          reservations: activeRows.map(mapActiveReservation),
          coverage: 'complete',
          observedAt: evaluatedAt,
        };
        const emergencyStopSnapshot = emergencyStopRow
          ? {
              active: emergencyStopRow.active,
              source: 'persisted' as const,
              changeId: emergencyStopRow.id,
              changedAt: new Date(emergencyStopRow.changedAt),
              coverage: 'complete' as const,
              observedAt: evaluatedAt,
            }
          : {
              active: true,
              source: 'configuration' as const,
              changeId: null,
              changedAt: null,
              coverage: 'partial' as const,
              observedAt: evaluatedAt,
            };
        const assessment = revalidateRealExecutionRisk(
          command.intent,
          command.quote,
          command.limits,
          command.budgetSnapshot,
          command.resourceSnapshot,
          command.quotaSnapshot,
          reservationSnapshot,
          mapReservation(reservationRow),
          mapArm(armRow),
          emergencyStopSnapshot,
          command.policy,
          evaluatedAt,
        );
        if (assessment.plan === null) {
          throw new RealExecutionRiskApprovalBlockedError(assessment.blockers);
        }

        const created = await tx.realExecutionRiskApproval.create({
          data: {
            id: command.request.id,
            reservationId: assessment.plan.reservationId,
            armId: assessment.plan.armId,
            providerId: assessment.plan.providerId,
            chainId: assessment.plan.chainId,
            intentId: assessment.plan.intentId,
            quoteId: assessment.plan.quoteId,
            emergencyStopChangeId: assessment.plan.emergencyStopChangeId,
            requestFingerprint,
            revalidatedAt: assessment.plan.revalidatedAt,
            expiresAt: assessment.plan.expiresAt,
          },
        });
        return { approval: mapApproval(created), replayed: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function fingerprint(command: RealExecutionRiskApprovalCommand): string {
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

function mapActiveReservation(row: {
  id: string;
  intentId: string;
  quoteId: string;
  budgetChargeUsdt: string;
  sourceTokenAddress: string;
  sourceQuantity: string;
  nativeGasQuantity: string;
  providerQuotaUsd: string;
  expiresAt: Date;
}): RealExecutionActiveReservation {
  return {
    id: row.id,
    intentId: row.intentId,
    quoteId: row.quoteId,
    budgetChargeUsdt: row.budgetChargeUsdt,
    sourceTokenAddress: row.sourceTokenAddress,
    sourceQuantity: row.sourceQuantity,
    nativeGasQuantity: row.nativeGasQuantity,
    providerQuotaUsd: row.providerQuotaUsd,
    expiresAt: new Date(row.expiresAt),
  };
}

function mapReservation(row: {
  id: string;
  providerId: string;
  chainId: string;
  intentId: string;
  quoteId: string;
  idempotencyKey: string;
  utcDay: Date;
  budgetChargeUsdt: string;
  sourceTokenAddress: string;
  sourceSymbol: string;
  sourceQuantity: string;
  nativeGasSymbol: string;
  nativeGasQuantity: string;
  providerQuotaUsd: string;
  expiresAt: Date;
  createdAt: Date;
}): StoredRealExecutionReservation {
  if (row.nativeGasSymbol !== 'BNB') {
    throw new Error('Persisted real execution reservation has invalid gas');
  }
  return {
    ...row,
    utcDay: row.utcDay.toISOString().slice(0, 10),
    nativeGasSymbol: 'BNB',
    expiresAt: new Date(row.expiresAt),
    createdAt: new Date(row.createdAt),
  };
}

function mapArm(row: {
  id: string;
  reservationId: string;
  providerId: string;
  chainId: string;
  intentId: string;
  quoteId: string;
  acknowledgment: string;
  requestedAt: Date;
  expiresAt: Date;
  createdAt: Date;
}): StoredRealExecutionArm {
  if (row.acknowledgment !== 'reservation_and_quote_reviewed') {
    throw new Error('Persisted real execution arm has invalid acknowledgment');
  }
  return {
    ...row,
    acknowledgment: 'reservation_and_quote_reviewed',
    requestedAt: new Date(row.requestedAt),
    expiresAt: new Date(row.expiresAt),
    createdAt: new Date(row.createdAt),
  };
}

function mapApproval(row: {
  id: string;
  reservationId: string;
  armId: string;
  providerId: string;
  chainId: string;
  intentId: string;
  quoteId: string;
  emergencyStopChangeId: string;
  revalidatedAt: Date;
  expiresAt: Date;
  createdAt: Date;
}): StoredRealExecutionRiskApproval {
  return {
    id: row.id,
    reservationId: row.reservationId,
    armId: row.armId,
    providerId: row.providerId,
    chainId: row.chainId,
    intentId: row.intentId,
    quoteId: row.quoteId,
    emergencyStopChangeId: row.emergencyStopChangeId,
    revalidatedAt: new Date(row.revalidatedAt),
    expiresAt: new Date(row.expiresAt),
    createdAt: new Date(row.createdAt),
    riskApproved: true,
    confirmationRecorded: false,
    submissionAuthorized: false,
  };
}
