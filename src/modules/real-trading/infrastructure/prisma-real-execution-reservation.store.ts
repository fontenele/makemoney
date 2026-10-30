import { assertNoUnresolvedApprovalCleanup } from './approval-cleanup-execution-guard';
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
  RealExecutionReservationProvenanceError,
  RealExecutionReservationStore,
  StoredRealExecutionReservation,
} from '../application/real-execution-reservation-store';

const ACTIVE_RESERVATION_READ_LIMIT = 101;

export class PrismaRealExecutionReservationStore implements RealExecutionReservationStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async reserve(input: RealExecutionReservationCommand): Promise<{
    reservation: StoredRealExecutionReservation;
    replayed: boolean;
  }> {
    // Keep validation, fingerprinting, and asynchronous writes on the same facts.
    const command = copyReservationFacts(input);
    if (!validProvenance(command)) {
      throw new RealExecutionReservationProvenanceError();
    }
    const requestFingerprint = fingerprint(command);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261001, 18)`;
        const diagnostic = await tx.$queryRaw<
          Array<{ id: string }>
        >`SELECT id FROM gas_diagnostics WHERE state <> 'prepared' OR expires_at > now() LIMIT 1`;
        if (diagnostic.length)
          throw new Error(
            'A gas diagnostic reservation requires review before ordinary execution',
          );

        await assertNoUnresolvedApprovalCleanup(tx);

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
            ...(command.provenance === undefined
              ? {}
              : {
                  accountingReconciliationId:
                    command.provenance.accountingReconciliationId,
                  accountingReconciliationFingerprint:
                    command.provenance.accountingReconciliationFingerprint,
                  providerObservedAt: command.provenance.providerObservedAt,
                  requirementValuationBasis:
                    command.provenance.requirementValuationBasis,
                  requirementValuedAt: command.provenance.requirementValuedAt,
                }),
            expiresAt: planned.expiresAt,
          },
        });
        return { reservation: mapReservation(created), replayed: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function copyReservationFacts<T>(value: T): T {
  if (value instanceof Date) return new Date(value.getTime()) as T;
  if (Array.isArray(value)) return value.map(copyReservationFacts) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, fact]) => [
        key,
        copyReservationFacts(fact),
      ]),
    ) as T;
  }
  return value;
}

function validProvenance(command: RealExecutionReservationCommand): boolean {
  const provenance = command.provenance;
  if (provenance === undefined) return true;
  return (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      provenance.accountingReconciliationId,
    ) &&
    /^[a-f0-9]{64}$/.test(provenance.accountingReconciliationFingerprint) &&
    provenance.providerObservedAt instanceof Date &&
    Number.isFinite(provenance.providerObservedAt.getTime()) &&
    provenance.providerObservedAt.getTime() ===
      command.quotaSnapshot.quotaObservedAt.getTime() &&
    provenance.requirementValuationBasis ===
      command.quotaSnapshot.requirementValuationBasis &&
    provenance.requirementValuedAt instanceof Date &&
    Number.isFinite(provenance.requirementValuedAt.getTime()) &&
    provenance.requirementValuedAt.getTime() ===
      command.quotaSnapshot.requirementValuedAt.getTime()
  );
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
  accountingReconciliationId: string | null;
  accountingReconciliationFingerprint: string | null;
  providerObservedAt: Date | null;
  requirementValuationBasis: string | null;
  requirementValuedAt: Date | null;
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
  const provenanceValues = [
    row.accountingReconciliationId,
    row.accountingReconciliationFingerprint,
    row.providerObservedAt,
    row.requirementValuationBasis,
    row.requirementValuedAt,
  ];
  const provenancePresent = provenanceValues.every((value) => value !== null);
  if (provenanceValues.some((value) => value !== null) && !provenancePresent) {
    throw new Error(
      'Persisted real execution reservation has partial provenance',
    );
  }
  if (
    provenancePresent &&
    (row.accountingReconciliationId === null ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
        row.accountingReconciliationId,
      ) ||
      row.accountingReconciliationFingerprint === null ||
      !/^[a-f0-9]{64}$/.test(row.accountingReconciliationFingerprint) ||
      !(row.providerObservedAt instanceof Date) ||
      !Number.isFinite(row.providerObservedAt.getTime()) ||
      row.requirementValuationBasis !== 'explicit_external_usd_value' ||
      !(row.requirementValuedAt instanceof Date) ||
      !Number.isFinite(row.requirementValuedAt.getTime()))
  ) {
    throw new Error(
      'Persisted real execution reservation has invalid provenance',
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
    provenance: provenancePresent
      ? {
          accountingReconciliationId: row.accountingReconciliationId!,
          accountingReconciliationFingerprint:
            row.accountingReconciliationFingerprint!,
          providerObservedAt: new Date(row.providerObservedAt!),
          requirementValuationBasis: 'explicit_external_usd_value',
          requirementValuedAt: new Date(row.requirementValuedAt!),
        }
      : null,
    expiresAt: new Date(row.expiresAt),
    createdAt: new Date(row.createdAt),
  };
}
