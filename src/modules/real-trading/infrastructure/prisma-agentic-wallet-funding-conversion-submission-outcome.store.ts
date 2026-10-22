import { Injectable } from '@nestjs/common';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletFundingConversionSubmissionOutcomeStore,
  FundingConversionSubmissionAttemptNotFoundError,
  FundingConversionSubmissionOutcomeBlockedError,
  FundingConversionSubmissionOutcomeConflictError,
  FundingConversionSubmissionOutcomeRecord,
  StoredFundingConversionSubmissionOutcome,
} from '../application/agentic-wallet-funding-conversion-submission-outcome.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

@Injectable()
export class PrismaAgenticWalletFundingConversionSubmissionOutcomeStore implements AgenticWalletFundingConversionSubmissionOutcomeStore {
  constructor(private readonly prisma: PrismaService) {}

  async record(value: FundingConversionSubmissionOutcomeRecord): Promise<{
    outcome: StoredFundingConversionSubmissionOutcome;
    replayed: boolean;
  }> {
    validate(value);
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261022, 128)`;
        const attempt =
          await tx.agenticWalletFundingConversionSubmissionAttempt.findUnique({
            where: { id: value.outcome.attemptId },
          });
        if (!attempt) {
          throw new FundingConversionSubmissionAttemptNotFoundError();
        }
        if (attempt.state !== 'submission_claimed') {
          if (
            attempt.state === value.outcome.status &&
            attempt.providerOrderId === value.outcome.providerOrderId &&
            attempt.responseFingerprint === value.outcome.responseFingerprint &&
            attempt.completedAt?.getTime() === value.completedAt.getTime() &&
            attempt.automaticRetryAllowed === false
          ) {
            return { outcome: stored(value), replayed: true };
          }
          throw new FundingConversionSubmissionOutcomeConflictError();
        }
        if (value.completedAt.getTime() < attempt.startedAt.getTime()) {
          throw new FundingConversionSubmissionOutcomeBlockedError();
        }

        await tx.agenticWalletFundingConversionSubmissionAttempt.update({
          where: { id: value.outcome.attemptId },
          data: {
            state: value.outcome.status,
            providerOrderId: value.outcome.providerOrderId,
            responseFingerprint: value.outcome.responseFingerprint,
            automaticRetryAllowed: false,
            completedAt: value.completedAt,
          },
        });
        return { outcome: stored(value), replayed: false };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function validate(value: FundingConversionSubmissionOutcomeRecord): void {
  const outcome = value.outcome;
  const pending = outcome.status === 'submitted_pending_confirmation';
  if (
    !UUID_PATTERN.test(outcome.attemptId) ||
    !HASH_PATTERN.test(outcome.responseFingerprint) ||
    !(value.completedAt instanceof Date) ||
    !Number.isFinite(value.completedAt.getTime()) ||
    outcome.executionSucceeded !== false ||
    outcome.statusLookupRequired !== true ||
    outcome.automaticRetryAllowed !== false ||
    (pending
      ? outcome.providerOrderId === null
      : outcome.providerOrderId !== null)
  ) {
    throw new FundingConversionSubmissionOutcomeBlockedError();
  }
}

function stored(
  value: FundingConversionSubmissionOutcomeRecord,
): StoredFundingConversionSubmissionOutcome {
  return {
    outcome: { ...value.outcome },
    completedAt: new Date(value.completedAt),
    stored: true,
  };
}
