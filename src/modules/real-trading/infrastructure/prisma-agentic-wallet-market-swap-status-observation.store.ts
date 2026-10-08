import { randomUUID } from 'node:crypto';

import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletMarketSwapStatusObservationBlockedError,
  AgenticWalletMarketSwapStatusObservationReceiptMismatchError,
  AgenticWalletMarketSwapStatusObservationReceiptNotFoundError,
  AgenticWalletMarketSwapStatusObservationStore,
  StoredAgenticWalletMarketSwapStatusObservation,
} from './agentic-wallet-market-swap-status-observation.store';
import {
  AgenticWalletMarketSwapStatusObservation,
  isValidAgenticWalletMarketSwapStatusObservation,
} from './agentic-wallet-market-swap-status-response';
import { assessAgenticWalletMarketSwapStatusTransition } from './agentic-wallet-market-swap-status-transition';
import {
  AgenticWalletMarketSwapSubmissionReceipt,
  isValidAgenticWalletMarketSwapSubmissionReceipt,
} from './agentic-wallet-market-swap-submission-response';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class PrismaAgenticWalletMarketSwapStatusObservationStore implements AgenticWalletMarketSwapStatusObservationStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
    private readonly nextId: () => string = randomUUID,
  ) {}

  async record(observation: AgenticWalletMarketSwapStatusObservation): Promise<{
    stored: StoredAgenticWalletMarketSwapStatusObservation;
    replayed: boolean;
  }> {
    if (!isValidAgenticWalletMarketSwapStatusObservation(observation)) {
      throw new AgenticWalletMarketSwapStatusObservationBlockedError([
        'invalid_next_observation',
      ]);
    }

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261003, 41)`;

        const receiptRow = await tx.realExecutionSubmissionReceipt.findUnique({
          where: { gateId: observation.gateId },
        });
        if (!receiptRow) {
          throw new AgenticWalletMarketSwapStatusObservationReceiptNotFoundError();
        }
        const receipt = {
          kind: 'agentic_wallet_market_swap_submission_receipt' as const,
          providerId: receiptRow.providerId,
          gateId: receiptRow.gateId,
          providerOrderId: receiptRow.providerOrderId,
          lifecycleStatus: receiptRow.lifecycleStatus,
          providerSubmissionAcknowledged:
            receiptRow.providerSubmissionAcknowledged,
          terminal: receiptRow.terminal,
          executionSucceeded: receiptRow.executionSucceeded,
          statusLookupRequired: receiptRow.statusLookupRequired,
          automaticRetryAllowed: receiptRow.automaticRetryAllowed,
        } as AgenticWalletMarketSwapSubmissionReceipt;
        if (!isValidAgenticWalletMarketSwapSubmissionReceipt(receipt)) {
          throw new Error(
            'Persisted market-swap submission receipt is invalid',
          );
        }
        if (!Number.isFinite(receiptRow.recordedAt.getTime())) {
          throw new Error(
            'Persisted market-swap submission receipt is invalid',
          );
        }
        if (
          receipt.providerId !== observation.providerId ||
          receipt.providerOrderId !== observation.providerOrderId
        ) {
          throw new AgenticWalletMarketSwapStatusObservationReceiptMismatchError();
        }

        const latestRow = await tx.realExecutionStatusObservation.findFirst({
          where: { gateId: observation.gateId },
          orderBy: { sequence: 'desc' },
        });
        const latest =
          latestRow === null
            ? null
            : mapPersistedAgenticWalletMarketSwapStatusObservation(latestRow);
        const transition = assessAgenticWalletMarketSwapStatusTransition(
          latest?.observation ?? null,
          observation,
        );
        if (transition.status === 'blocked') {
          throw new AgenticWalletMarketSwapStatusObservationBlockedError(
            transition.blockers,
          );
        }
        if (!transition.persistenceRequired && latest !== null) {
          return { stored: latest, replayed: true };
        }

        const recordedAt = this.now();
        if (
          !(recordedAt instanceof Date) ||
          !Number.isFinite(recordedAt.getTime()) ||
          recordedAt.getTime() < receiptRow.recordedAt.getTime() ||
          (latest !== null &&
            recordedAt.getTime() < latest.recordedAt.getTime())
        ) {
          throw new Error('Status observation recording time is invalid');
        }
        const id = this.nextId();
        if (!UUID_PATTERN.test(id)) {
          throw new Error('Status observation identity is invalid');
        }
        const created = await tx.realExecutionStatusObservation.create({
          data: {
            id,
            gateId: observation.gateId,
            providerId: observation.providerId,
            providerOrderId: observation.providerOrderId,
            providerStatus: observation.providerStatus,
            transactionHash: observation.transactionHash,
            bookedAt: observation.bookedAt,
            providerUpdatedAt: observation.updatedAt,
            recordedAt,
          },
        });
        return {
          stored: mapPersistedAgenticWalletMarketSwapStatusObservation(created),
          replayed: false,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

export function mapPersistedAgenticWalletMarketSwapStatusObservation(row: {
  id: string;
  gateId: string;
  providerId: string;
  providerOrderId: string;
  providerStatus: string;
  transactionHash: string | null;
  bookedAt: Date;
  providerUpdatedAt: Date;
  recordedAt: Date;
}): StoredAgenticWalletMarketSwapStatusObservation {
  const providerStatus = row.providerStatus as
    'PENDING' | 'FINISHED' | 'FAILED';
  const observation = {
    kind: 'agentic_wallet_market_swap_status_observation' as const,
    providerId: row.providerId,
    gateId: row.gateId,
    providerOrderId: row.providerOrderId,
    providerStatus,
    transactionHash: row.transactionHash,
    bookedAt: new Date(row.bookedAt),
    updatedAt: new Date(row.providerUpdatedAt),
    terminal: providerStatus !== 'PENDING',
    executionSucceeded: providerStatus === 'FINISHED',
    statusLookupRequired: providerStatus === 'PENDING',
    financialReconciliationRequired: true as const,
    financialReconciliationComplete: false as const,
    actualReceivedQuantity: null,
    submissionRetryAllowed: false as const,
  } as AgenticWalletMarketSwapStatusObservation;
  if (
    !isValidAgenticWalletMarketSwapStatusObservation(observation) ||
    !UUID_PATTERN.test(row.id) ||
    !Number.isFinite(row.recordedAt.getTime())
  ) {
    throw new Error('Persisted market-swap status observation is invalid');
  }
  return { id: row.id, observation, recordedAt: new Date(row.recordedAt) };
}
