import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletFundingConversionStatusObservationStore,
  FundingConversionStatusAttemptNotFoundError,
  FundingConversionStatusObservationBlockedError,
  FundingConversionStatusObservationConflictError,
  StoredFundingConversionStatusObservation,
} from '../application/agentic-wallet-funding-conversion-status-observation.store';
import {
  FundingConversionStatusObservation,
  isValidFundingConversionStatusObservation,
} from './agentic-wallet-funding-conversion-status-response';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

@Injectable()
export class PrismaAgenticWalletFundingConversionStatusObservationStore implements AgenticWalletFundingConversionStatusObservationStore {
  constructor(private readonly prisma: PrismaService) {}

  async record(
    id: string,
    observation: FundingConversionStatusObservation,
    recordedAt: Date,
  ): Promise<{
    stored: StoredFundingConversionStatusObservation;
    replayed: boolean;
  }> {
    if (
      !UUID_PATTERN.test(id) ||
      !isValidFundingConversionStatusObservation(observation) ||
      !(recordedAt instanceof Date) ||
      !Number.isFinite(recordedAt.getTime()) ||
      recordedAt.getTime() < observation.providerUpdatedAt.getTime()
    )
      throw new FundingConversionStatusObservationBlockedError();

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261022, 132)`;
        const attempt =
          await tx.agenticWalletFundingConversionSubmissionAttempt.findUnique({
            where: { id: observation.attemptId },
          });
        if (!attempt) throw new FundingConversionStatusAttemptNotFoundError();
        if (
          attempt.providerOrderId !== observation.providerOrderId ||
          attempt.automaticRetryAllowed !== false
        )
          throw new FundingConversionStatusObservationBlockedError();

        const existing =
          await tx.agenticWalletFundingConversionStatusObservation.findUnique({
            where: {
              attemptId_providerUpdatedAt: {
                attemptId: observation.attemptId,
                providerUpdatedAt: observation.providerUpdatedAt,
              },
            },
          });
        if (existing) {
          if (!same(existing, observation))
            throw new FundingConversionStatusObservationConflictError();
          return { stored: map(existing), replayed: true };
        }
        if (attempt.state !== 'submitted_pending_confirmation')
          throw new FundingConversionStatusObservationBlockedError();

        const latest =
          await tx.agenticWalletFundingConversionStatusObservation.findFirst({
            where: { attemptId: observation.attemptId },
            orderBy: [{ providerUpdatedAt: 'desc' }, { id: 'desc' }],
          });
        if (
          latest &&
          (latest.providerUpdatedAt.getTime() >
            observation.providerUpdatedAt.getTime() ||
            latest.bookedAt.getTime() !== observation.bookedAt.getTime() ||
            latest.providerStatus !== 'PENDING')
        )
          throw new FundingConversionStatusObservationBlockedError();

        const created =
          await tx.agenticWalletFundingConversionStatusObservation.create({
            data: {
              id,
              attemptId: observation.attemptId,
              providerOrderId: observation.providerOrderId,
              providerStatus: observation.providerStatus,
              transactionHash: observation.transactionHash,
              bookedAt: observation.bookedAt,
              providerUpdatedAt: observation.providerUpdatedAt,
              recordedAt,
            },
          });
        if (observation.terminal) {
          await tx.agenticWalletFundingConversionSubmissionAttempt.update({
            where: { id: observation.attemptId },
            data: {
              state:
                observation.providerStatus === 'FINISHED'
                  ? 'provider_finished_pending_financial_reconciliation'
                  : 'provider_failed',
            },
          });
        }
        return { stored: map(created), replayed: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function same(
  row: {
    attemptId: string;
    providerOrderId: string;
    providerStatus: string;
    transactionHash: string | null;
    bookedAt: Date;
  },
  observation: FundingConversionStatusObservation,
): boolean {
  return (
    row.attemptId === observation.attemptId &&
    row.providerOrderId === observation.providerOrderId &&
    row.providerStatus === observation.providerStatus &&
    row.transactionHash === observation.transactionHash &&
    row.bookedAt.getTime() === observation.bookedAt.getTime()
  );
}

function map(row: {
  id: string;
  attemptId: string;
  providerOrderId: string;
  providerStatus: string;
  transactionHash: string | null;
  bookedAt: Date;
  providerUpdatedAt: Date;
  recordedAt: Date;
}): StoredFundingConversionStatusObservation {
  const status = row.providerStatus as 'PENDING' | 'FINISHED' | 'FAILED';
  const observation: FundingConversionStatusObservation = {
    attemptId: row.attemptId,
    providerOrderId: row.providerOrderId,
    providerStatus: status,
    transactionHash: row.transactionHash,
    bookedAt: new Date(row.bookedAt),
    providerUpdatedAt: new Date(row.providerUpdatedAt),
    terminal: status !== 'PENDING',
    executionSucceeded: status === 'FINISHED',
    financialReconciliationRequired: true,
    financialReconciliationComplete: false,
    automaticRetryAllowed: false,
  };
  if (!isValidFundingConversionStatusObservation(observation))
    throw new Error(
      'Persisted funding conversion status observation is invalid',
    );
  return { id: row.id, observation, recordedAt: new Date(row.recordedAt) };
}
