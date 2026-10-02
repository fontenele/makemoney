import { createHash } from 'node:crypto';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { planRealExecutionArm } from '../application/real-execution-arm-plan';
import {
  RealExecutionArmCommand,
  RealExecutionArmIdempotencyConflictError,
  RealExecutionArmIdentityConflictError,
  RealExecutionArmPlanError,
  RealExecutionArmReservationNotFoundError,
  RealExecutionArmStore,
  StoredRealExecutionArm,
} from '../application/real-execution-arm-store';
import { StoredRealExecutionReservation } from '../application/real-execution-reservation-store';

export class PrismaRealExecutionArmStore implements RealExecutionArmStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async arm(command: RealExecutionArmCommand): Promise<{
    arm: StoredRealExecutionArm;
    replayed: boolean;
  }> {
    const requestFingerprint = fingerprint(command);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261001, 20)`;

        const existing = await tx.realExecutionArm.findUnique({
          where: { id: command.request.id },
        });
        if (existing) {
          if (existing.requestFingerprint !== requestFingerprint) {
            throw new RealExecutionArmIdempotencyConflictError();
          }
          return { arm: mapArm(existing), replayed: true };
        }

        const reservationRow = await tx.realExecutionReservation.findUnique({
          where: { id: command.request.reservationId },
        });
        if (!reservationRow) {
          throw new RealExecutionArmReservationNotFoundError();
        }
        const identityConflict = await tx.realExecutionArm.findFirst({
          where: {
            OR: [
              { reservationId: command.request.reservationId },
              { intentId: command.request.intentId },
              { quoteId: command.request.quoteId },
            ],
          },
          select: { id: true },
        });
        if (identityConflict) {
          throw new RealExecutionArmIdentityConflictError();
        }

        const evaluatedAt = this.now();
        const assessment = planRealExecutionArm(
          mapReservation(reservationRow),
          command.request,
          command.policy,
          evaluatedAt,
        );
        if (assessment.plan === null) {
          throw new RealExecutionArmPlanError(assessment.blockers);
        }
        const created = await tx.realExecutionArm.create({
          data: {
            id: assessment.plan.id,
            reservationId: assessment.plan.reservationId,
            providerId: assessment.plan.providerId,
            chainId: assessment.plan.chainId,
            intentId: assessment.plan.intentId,
            quoteId: assessment.plan.quoteId,
            acknowledgment: assessment.plan.acknowledgment,
            requestFingerprint,
            requestedAt: assessment.plan.requestedAt,
            expiresAt: assessment.plan.expiresAt,
          },
        });
        return { arm: mapArm(created), replayed: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function fingerprint(command: RealExecutionArmCommand): string {
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

function mapReservation(row: {
  id: string;
  providerId: string;
  chainId: string;
  intentId: string;
  quoteId: string;
  idempotencyKey: string;
  payloadCommitmentVersion: string | null;
  payloadCommitmentDigest: string | null;
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
  if (
    row.payloadCommitmentVersion !== 'real_execution_intent_quote_v1' ||
    row.payloadCommitmentDigest === null ||
    !/^[a-f0-9]{64}$/.test(row.payloadCommitmentDigest)
  ) {
    throw new Error(
      'Persisted real execution reservation has invalid payload commitment',
    );
  }
  return {
    ...row,
    utcDay: row.utcDay.toISOString().slice(0, 10),
    nativeGasSymbol: 'BNB',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: row.payloadCommitmentDigest,
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
    id: row.id,
    reservationId: row.reservationId,
    providerId: row.providerId,
    chainId: row.chainId,
    intentId: row.intentId,
    quoteId: row.quoteId,
    acknowledgment: 'reservation_and_quote_reviewed',
    requestedAt: new Date(row.requestedAt),
    expiresAt: new Date(row.expiresAt),
    createdAt: new Date(row.createdAt),
  };
}
