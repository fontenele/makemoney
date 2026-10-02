import { createHash } from 'node:crypto';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { planRealExecutionReservation } from '../application/real-execution-reservation-plan';
import { assessRealExecutionPayloadCommitment } from '../application/real-execution-payload-commitment';
import {
  assessRealExecutionReservationCapacity,
  RealExecutionReservationCapacitySnapshot,
} from '../application/real-execution-reservation-capacity';
import {
  RealExecutionReservationCapacityError,
  RealExecutionReservationCommand,
  RealExecutionReservationIdempotencyConflictError,
  RealExecutionReservationIdentityConflictError,
  RealExecutionReservationPayloadCommitmentError,
  RealExecutionReservationStore,
  StoredRealExecutionReservation,
} from '../application/real-execution-reservation-store';

const ACTIVE_RESERVATION_READ_LIMIT = 101;

export class PrismaRealExecutionReservationStore implements RealExecutionReservationStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async reserve(command: RealExecutionReservationCommand): Promise<{
    reservation: StoredRealExecutionReservation;
    replayed: boolean;
  }> {
    const requestFingerprint = fingerprint(command);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261001, 18)`;

        const existing = await tx.realExecutionReservation.findUnique({
          where: { idempotencyKey: command.intent.idempotencyKey },
        });
        if (existing) {
          if (existing.requestFingerprint !== requestFingerprint) {
            throw new RealExecutionReservationIdempotencyConflictError();
          }
          return { reservation: mapReservation(existing), replayed: true };
        }

        const identityConflict = await tx.realExecutionReservation.findFirst({
          where: {
            OR: [
              { intentId: command.intent.id },
              { quoteId: command.quote.id },
            ],
          },
          select: { id: true },
        });
        if (identityConflict) {
          throw new RealExecutionReservationIdentityConflictError();
        }

        const evaluatedAt = this.now();
        const utcDay = evaluatedAt.toISOString().slice(0, 10);
        const activeRows = await tx.realExecutionReservation.findMany({
          where: {
            providerId: command.quote.providerId,
            chainId: command.intent.chainId,
            utcDay: new Date(`${utcDay}T00:00:00.000Z`),
            expiresAt: { gt: evaluatedAt },
          },
          orderBy: [{ expiresAt: 'asc' }, { id: 'asc' }],
          take: ACTIVE_RESERVATION_READ_LIMIT,
        });
        const reservationSnapshot: RealExecutionReservationCapacitySnapshot = {
          providerId: command.quote.providerId,
          chainId: command.intent.chainId,
          utcDay,
          reservations: activeRows.map((row) => ({
            id: row.id,
            intentId: row.intentId,
            quoteId: row.quoteId,
            budgetChargeUsdt: row.budgetChargeUsdt,
            sourceTokenAddress: row.sourceTokenAddress,
            sourceQuantity: row.sourceQuantity,
            nativeGasQuantity: row.nativeGasQuantity,
            providerQuotaUsd: row.providerQuotaUsd,
            expiresAt: row.expiresAt,
          })),
          coverage: 'complete',
          observedAt: evaluatedAt,
        };
        const capacity = assessRealExecutionReservationCapacity(
          command.intent,
          command.quote,
          command.limits,
          command.budgetSnapshot,
          command.resourceSnapshot,
          command.quotaSnapshot,
          reservationSnapshot,
          command.freshness,
          evaluatedAt,
        );
        if (capacity.status !== 'reservation_capacity_available') {
          throw new RealExecutionReservationCapacityError(capacity.blockers);
        }
        const planned = planRealExecutionReservation(
          command.intent,
          command.quote,
          command.limits,
          command.budgetSnapshot,
          command.resourceSnapshot,
          command.quotaSnapshot,
          command.freshness,
          evaluatedAt,
        ).plan;
        if (planned === null) {
          throw new RealExecutionReservationCapacityError([
            'reservation_plan_blocked',
          ]);
        }
        const payloadAssessment = assessRealExecutionPayloadCommitment(
          command.intent,
          command.quote,
          evaluatedAt,
        );
        const payloadCommitment = payloadAssessment.commitment;
        if (payloadCommitment === null) {
          throw new RealExecutionReservationPayloadCommitmentError(
            payloadAssessment.blockers,
          );
        }

        const created = await tx.realExecutionReservation.create({
          data: {
            providerId: planned.providerId,
            chainId: planned.chainId,
            intentId: planned.intentId,
            quoteId: planned.quoteId,
            idempotencyKey: planned.idempotencyKey,
            requestFingerprint,
            payloadCommitmentVersion: payloadCommitment.version,
            payloadCommitmentDigest: payloadCommitment.digest,
            utcDay: new Date(`${planned.utcDay}T00:00:00.000Z`),
            budgetChargeUsdt: planned.budgetChargeUsdt,
            sourceTokenAddress: planned.sourceTokenAddress,
            sourceSymbol: planned.sourceSymbol,
            sourceQuantity: planned.sourceQuantity,
            nativeGasSymbol: planned.nativeGasSymbol,
            nativeGasQuantity: planned.nativeGasQuantity,
            providerQuotaUsd: planned.providerQuotaUsd,
            expiresAt: planned.expiresAt,
          },
        });
        return { reservation: mapReservation(created), replayed: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function fingerprint(command: RealExecutionReservationCommand): string {
  return createHash('sha256')
    .update(JSON.stringify(canonicalize(command)))
    .digest('hex');
}

function canonicalize(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
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
    id: row.id,
    providerId: row.providerId,
    chainId: row.chainId,
    intentId: row.intentId,
    quoteId: row.quoteId,
    idempotencyKey: row.idempotencyKey,
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: row.payloadCommitmentDigest,
    utcDay: row.utcDay.toISOString().slice(0, 10),
    budgetChargeUsdt: row.budgetChargeUsdt,
    sourceTokenAddress: row.sourceTokenAddress,
    sourceSymbol: row.sourceSymbol,
    sourceQuantity: row.sourceQuantity,
    nativeGasSymbol: 'BNB',
    nativeGasQuantity: row.nativeGasQuantity,
    providerQuotaUsd: row.providerQuotaUsd,
    expiresAt: new Date(row.expiresAt),
    createdAt: new Date(row.createdAt),
  };
}
