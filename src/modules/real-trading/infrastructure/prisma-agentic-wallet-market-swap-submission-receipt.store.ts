import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { isStructurallyValidAgenticWalletMarketSwapGate } from './agentic-wallet-market-swap-command';
import { mapPersistedRealExecutionSubmissionGate } from './prisma-real-execution-submission-gate.store';
import {
  AgenticWalletMarketSwapSubmissionReceiptBlockedError,
  AgenticWalletMarketSwapSubmissionReceiptConflictError,
  AgenticWalletMarketSwapSubmissionReceiptGateNotFoundError,
  AgenticWalletMarketSwapSubmissionReceiptStore,
  AgenticWalletMarketSwapProviderOrderIdentityConflictError,
  StoredAgenticWalletMarketSwapSubmissionReceipt,
} from './agentic-wallet-market-swap-submission-receipt.store';
import {
  AgenticWalletMarketSwapSubmissionReceipt,
  isValidAgenticWalletMarketSwapSubmissionReceipt,
} from './agentic-wallet-market-swap-submission-response';

export class PrismaAgenticWalletMarketSwapSubmissionReceiptStore implements AgenticWalletMarketSwapSubmissionReceiptStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async record(receipt: AgenticWalletMarketSwapSubmissionReceipt): Promise<{
    stored: StoredAgenticWalletMarketSwapSubmissionReceipt;
    replayed: boolean;
  }> {
    if (!isValidAgenticWalletMarketSwapSubmissionReceipt(receipt)) {
      throw new AgenticWalletMarketSwapSubmissionReceiptBlockedError();
    }

    return this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261003, 40)`;

        const existing = await tx.realExecutionSubmissionReceipt.findUnique({
          where: { gateId: receipt.gateId },
        });
        if (existing) {
          const stored =
            mapPersistedAgenticWalletMarketSwapSubmissionReceipt(existing);
          if (stored.receipt.providerOrderId !== receipt.providerOrderId) {
            throw new AgenticWalletMarketSwapSubmissionReceiptConflictError();
          }
          return { stored, replayed: true };
        }

        const providerOrderConflict =
          await tx.realExecutionSubmissionReceipt.findUnique({
            where: { providerOrderId: receipt.providerOrderId },
            select: { gateId: true },
          });
        if (providerOrderConflict) {
          throw new AgenticWalletMarketSwapProviderOrderIdentityConflictError();
        }

        const gateRow = await tx.realExecutionSubmissionGate.findUnique({
          where: { id: receipt.gateId },
        });
        if (!gateRow) {
          throw new AgenticWalletMarketSwapSubmissionReceiptGateNotFoundError();
        }
        const gate = mapPersistedRealExecutionSubmissionGate(gateRow);
        if (!isStructurallyValidAgenticWalletMarketSwapGate(gate)) {
          throw new Error(
            'Persisted real execution submission gate is invalid',
          );
        }

        const recordedAt = this.now();
        if (
          !(recordedAt instanceof Date) ||
          !Number.isFinite(recordedAt.getTime()) ||
          recordedAt.getTime() < gate.createdAt.getTime()
        ) {
          throw new Error('Submission receipt recording time is invalid');
        }
        const created = await tx.realExecutionSubmissionReceipt.create({
          data: {
            gateId: receipt.gateId,
            providerId: receipt.providerId,
            providerOrderId: receipt.providerOrderId,
            lifecycleStatus: receipt.lifecycleStatus,
            providerSubmissionAcknowledged:
              receipt.providerSubmissionAcknowledged,
            terminal: receipt.terminal,
            executionSucceeded: receipt.executionSucceeded,
            statusLookupRequired: receipt.statusLookupRequired,
            automaticRetryAllowed: receipt.automaticRetryAllowed,
            recordedAt,
          },
        });
        return {
          stored: mapPersistedAgenticWalletMarketSwapSubmissionReceipt(created),
          replayed: false,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

export function mapPersistedAgenticWalletMarketSwapSubmissionReceipt(row: {
  gateId: string;
  providerId: string;
  providerOrderId: string;
  lifecycleStatus: string;
  providerSubmissionAcknowledged: boolean;
  terminal: boolean;
  executionSucceeded: boolean;
  statusLookupRequired: boolean;
  automaticRetryAllowed: boolean;
  recordedAt: Date;
}): StoredAgenticWalletMarketSwapSubmissionReceipt {
  const receipt = {
    kind: 'agentic_wallet_market_swap_submission_receipt' as const,
    providerId: row.providerId,
    gateId: row.gateId,
    providerOrderId: row.providerOrderId,
    lifecycleStatus: row.lifecycleStatus,
    providerSubmissionAcknowledged: row.providerSubmissionAcknowledged,
    terminal: row.terminal,
    executionSucceeded: row.executionSucceeded,
    statusLookupRequired: row.statusLookupRequired,
    automaticRetryAllowed: row.automaticRetryAllowed,
  } as AgenticWalletMarketSwapSubmissionReceipt;
  if (
    !isValidAgenticWalletMarketSwapSubmissionReceipt(receipt) ||
    !Number.isFinite(row.recordedAt.getTime())
  ) {
    throw new Error('Persisted market-swap submission receipt is invalid');
  }
  return { receipt, recordedAt: new Date(row.recordedAt) };
}
